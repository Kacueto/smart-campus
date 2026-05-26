"""Controlador crítico: valida QR escaneado por el edge node y registra acceso + asistencia.

Orquesta:
  - jwt_handler (resolución de short token + verificación RS256 + nonce anti-replay)
  - user_model / horario_model / reserva_model (4 casos de derecho de acceso)
  - acceso_model + asistencia_model (persistencia)
  - mqtt_client (eco del resultado al edge)
"""
import logging
from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.jwt_handler import verify_token, resolve_qr_token
from app.views.acceso_view import ScanRequest, AccesoResponse
from app.models import acceso_model, asistencia_model, horario_model, reserva_model, user_model
from app import mqtt_client

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/acceso", tags=["Acceso Edge"])


@router.post("/validar-qr", response_model=AccesoResponse)
async def validar_qr(req: ScanRequest, db: AsyncSession = Depends(get_db)):
    """Valida el QR enviado por el edge y registra acceso + asistencia si aplica."""
    try:
        return await _validar_qr_impl(req, db)
    except Exception as e:
        logger.exception(f"Error inesperado en validar_qr: {e}")
        raise


async def _validar_qr_impl(req: ScanRequest, db: AsyncSession) -> AccesoResponse:
    # 1. Resolver código corto → JWT completo (puede venir como short code o como JWT directo)
    qr_token = resolve_qr_token(req.qr_token) or req.qr_token

    # 2. Verificar firma RS256 + blacklist + nonce anti-replay
    payload = verify_token(qr_token)
    if not payload:
        await acceso_model.registrar_acceso(
            db, None, req.aula_id, "denegado", req.ip_edge,
            motivo="token_invalido_o_expirado",
        )
        return AccesoResponse(acceso="denegado", motivo="Token inválido o expirado")

    if payload.get("type") != "qr":
        return AccesoResponse(acceso="denegado", motivo="Tipo de token incorrecto")

    user_id       = payload.get("sub")
    aula_id_token = payload.get("aula_id")
    nonce         = payload.get("nonce")

    # 3. El QR debe coincidir con el aula del nodo que escanea
    if aula_id_token != req.aula_id:
        await acceso_model.registrar_acceso(
            db, user_id, req.aula_id, "denegado", req.ip_edge,
            nonce=nonce, motivo="aula_incorrecta",
        )
        return AccesoResponse(acceso="denegado", motivo="QR no corresponde a esta aula")

    # 4. Validar usuario activo
    uid      = UUID(user_id)
    aula_uid = UUID(req.aula_id)
    user = await user_model.obtener_por_id(db, uid)
    if not user or not user.activo:
        await acceso_model.registrar_acceso(
            db, user_id, req.aula_id, "denegado", req.ip_edge,
            nonce=nonce, motivo="usuario_inactivo",
        )
        return AccesoResponse(acceso="denegado", motivo="Usuario no encontrado o inactivo")

    # 5. Verificar derecho de acceso AHORA — cuatro casos
    # Caso A: estudiante con clase inscrita activa
    clase_row = await horario_model.buscar_clase_activa_estudiante(db, aula_uid, uid)

    # Caso B: docente con clase asignada activa
    if not clase_row and str(user.rol) == "docente":
        clase_row = await horario_model.buscar_clase_activa_docente(db, aula_uid, uid)

    # Caso C: reserva activa del usuario
    reserva_row = None
    if not clase_row:
        reserva_row = await reserva_model.buscar_reserva_usuario_activa(db, aula_uid, uid)

    # Caso D: cualquier reserva activa del aula
    reserva_aula_row = None
    if not clase_row and not reserva_row:
        reserva_aula_row = await reserva_model.buscar_reserva_aula_activa(db, aula_uid)

    if not clase_row and not reserva_row and not reserva_aula_row:
        await acceso_model.registrar_acceso(
            db, user_id, req.aula_id, "denegado", req.ip_edge,
            nonce=nonce, motivo="sin_clase_ni_reserva",
        )
        return AccesoResponse(
            acceso="denegado",
            motivo="No tienes clase ni reserva activa en esta aula",
            nombre=user.nombre,
            codigo=user.codigo,
            rol=str(user.rol),
        )

    # 6. Acceso permitido → registrar evento (y asistencia si hay clase oficial)
    horario_id = str(clase_row.horario_id) if clase_row else None

    await acceso_model.registrar_acceso(
        db, user_id, req.aula_id, "permitido", req.ip_edge,
        nonce=nonce, motivo="acceso_valido",
    )

    if clase_row:
        await asistencia_model.registrar_asistencia_qr(db, uid, aula_uid, UUID(horario_id))
        await db.commit()

    logger.info(f"Acceso permitido: {user.codigo} → aula {req.aula_id}")

    respuesta = AccesoResponse(
        acceso="permitido",
        motivo="clase_activa" if clase_row else "reserva_activa",
        nombre=user.nombre,
        codigo=user.codigo,
        rol=str(user.rol),
    )

    # 7. Publicar resultado vía MQTT al edge node
    mqtt_client.publish_resultado(req.aula_id, respuesta.model_dump())
    return respuesta
