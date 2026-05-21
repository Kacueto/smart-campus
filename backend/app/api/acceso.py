from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from app.database import get_db
from app.auth.jwt_handler import verify_token, resolve_qr_token
from app import mqtt_client
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/acceso", tags=["Acceso Edge"])


class ScanRequest(BaseModel):
    qr_token: str
    aula_id: str
    ip_edge: Optional[str] = None


class AccesoResponse(BaseModel):
    acceso: str        # "permitido" | "denegado"
    motivo: str
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    rol: Optional[str] = None


@router.post("/validar-qr", response_model=AccesoResponse)
async def validar_qr(req: ScanRequest, db: AsyncSession = Depends(get_db)):
    try:
        return await _validar_qr_impl(req, db)
    except Exception as e:
        logger.exception(f"Error inesperado en validar_qr: {e}")
        raise


async def _validar_qr_impl(req: ScanRequest, db: AsyncSession):
    ahora = datetime.now(timezone.utc)

    # 1. Resolver código corto → JWT completo
    qr_token = resolve_qr_token(req.qr_token) or req.qr_token

    # Validar JWT (firma, expiración, nonce anti-replay)
    payload = verify_token(qr_token)
    if not payload:
        await _registrar_acceso(db, None, req.aula_id, "denegado", req.ip_edge,
                                payload=None, motivo="token_invalido_o_expirado")
        return AccesoResponse(acceso="denegado", motivo="Token inválido o expirado")

    if payload.get("type") != "qr":
        return AccesoResponse(acceso="denegado", motivo="Tipo de token incorrecto")

    user_id  = payload.get("sub")
    aula_id_token = payload.get("aula_id")
    nonce    = payload.get("nonce")

    # 2. Verificar que el aula del token coincide con el nodo que escanea
    if aula_id_token != req.aula_id:
        await _registrar_acceso(db, user_id, req.aula_id, "denegado", req.ip_edge,
                                nonce=nonce, motivo="aula_incorrecta")
        return AccesoResponse(acceso="denegado", motivo="QR no corresponde a esta aula")

    # Convertir a UUID para asyncpg (es estricto con tipos)
    uid     = UUID(user_id)
    aula_uid = UUID(req.aula_id)

    # 3. Obtener datos del usuario
    result = await db.execute(
        text("SELECT id, nombre, codigo, rol, activo FROM users WHERE id = :id"),
        {"id": uid}
    )
    user = result.fetchone()
    if not user or not user.activo:
        await _registrar_acceso(db, user_id, req.aula_id, "denegado", req.ip_edge,
                                nonce=nonce, motivo="usuario_inactivo")
        return AccesoResponse(acceso="denegado", motivo="Usuario no encontrado o inactivo")

    # 4. Verificar que el usuario tiene derecho de acceso en este momento
    # Caso A: clase oficial inscrita activa ahora
    clase = await db.execute(text("""
        SELECT h.id as horario_id
        FROM horarios h
        JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.aula_id = :aula_id
          AND i.user_id = :user_id
          AND h.activo = true
          AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
          AND h.hora_inicio <= (NOW() AT TIME ZONE 'America/Bogota')::time
          AND h.hora_fin    >= (NOW() AT TIME ZONE 'America/Bogota')::time
    """), {"aula_id": aula_uid, "user_id": uid})
    clase_row = clase.fetchone()

    # Caso B: docente con clase activa en esta aula ahora
    if not clase_row and str(user.rol) == "docente":
        clase = await db.execute(text("""
            SELECT h.id as horario_id
            FROM horarios h
            WHERE h.aula_id = :aula_id
              AND h.docente_id = :user_id
              AND h.activo = true
              AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
              AND h.hora_inicio <= (NOW() AT TIME ZONE 'America/Bogota')::time
              AND h.hora_fin    >= (NOW() AT TIME ZONE 'America/Bogota')::time
        """), {"aula_id": aula_uid, "user_id": uid})
        clase_row = clase.fetchone()

    # Caso C: reserva activa del usuario en este momento
    reserva = None
    if not clase_row:
        reserva = await db.execute(text("""
            SELECT id FROM reservas
            WHERE aula_id = :aula_id
              AND user_id = :user_id
              AND estado = 'activa'
              AND inicio <= NOW()
              AND fin    >= NOW()
        """), {"aula_id": aula_uid, "user_id": uid})
        reserva_row = reserva.fetchone()
    else:
        reserva_row = None

    # Caso D: reserva del aula activa (cualquier usuario puede entrar)
    reserva_aula = None
    if not clase_row and not reserva_row:
        reserva_aula = await db.execute(text("""
            SELECT id FROM reservas
            WHERE aula_id = :aula_id
              AND estado = 'activa'
              AND inicio <= NOW()
              AND fin    >= NOW()
        """), {"aula_id": aula_uid})
        reserva_aula_row = reserva_aula.fetchone()
    else:
        reserva_aula_row = None

    if not clase_row and not reserva_row and not reserva_aula_row:
        await _registrar_acceso(db, user_id, req.aula_id, "denegado", req.ip_edge,
                                nonce=nonce, motivo="sin_clase_ni_reserva")
        return AccesoResponse(
            acceso="denegado",
            motivo="No tienes clase ni reserva activa en esta aula",
            nombre=user.nombre,
            codigo=user.codigo,
            rol=str(user.rol),
        )

    # 5. Acceso permitido — registrar evento y asistencia
    horario_id = str(clase_row.horario_id) if clase_row else None

    await _registrar_acceso(db, user_id, req.aula_id, "permitido", req.ip_edge,
                            nonce=nonce, motivo="acceso_valido")

    # Registrar asistencia solo si hay clase oficial
    if clase_row:
        await db.execute(text("""
            INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
            VALUES (:user_id, :aula_id, :horario_id, NOW(), 'qr', true)
        """), {"user_id": uid, "aula_id": aula_uid, "horario_id": UUID(horario_id)})

    await db.commit()

    logger.info(f"Acceso permitido: {user.codigo} → aula {req.aula_id}")

    respuesta = AccesoResponse(
        acceso="permitido",
        motivo="clase_activa" if clase_row else "reserva_activa",
        nombre=user.nombre,
        codigo=user.codigo,
        rol=str(user.rol),
    )
    mqtt_client.publish_resultado(req.aula_id, respuesta.model_dump())
    return respuesta


async def _registrar_acceso(db, user_id, aula_id, evento, ip_edge, nonce=None,
                             payload=None, motivo=""):
    try:
        await db.execute(text("""
            INSERT INTO accesos (user_id, aula_id, evento, token_nonce, ip_edge, detalle)
            VALUES (:user_id, :aula_id, :evento, :nonce, :ip_edge, :detalle::jsonb)
        """), {
            "user_id":  UUID(user_id) if user_id else None,
            "aula_id":  UUID(aula_id) if aula_id else None,
            "evento":   evento,
            "nonce":    nonce,
            "ip_edge":  ip_edge,
            "detalle":  f'{{"motivo": "{motivo}"}}',
        })
        await db.commit()
    except Exception as e:
        logger.error(f"Error registrando acceso: {e}")
        await db.rollback()
