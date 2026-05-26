"""Controlador del profesor: clases del día, todas las clases, generar QR, asistencia de sesión."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import require_role
from app.auth.jwt_handler import create_qr_token
from app.views.auth_view import TokenData, UserRole
from app.models import horario_model, asistencia_model

router = APIRouter(prefix="/profesor", tags=["Profesor"])

_DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles",
         4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


@router.get("/mis-clases-hoy")
async def mis_clases_hoy(
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    """Retorna las clases del docente para el día actual según la zona horaria de Bogotá."""
    rows = await horario_model.obtener_clases_hoy_docente(db, current_user.user_id)
    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               _DIAS.get(row.dia_semana, ""),
            "hora_inicio":       row.hora_inicio[:5],
            "hora_fin":          row.hora_fin[:5],
            "horario":           f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":              f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":           str(row.aula_id),
            "aula_codigo":       row.aula_codigo,
            "total_estudiantes": row.total_estudiantes,
        }
        for row in rows
    ]


@router.get("/todas-mis-clases")
async def todas_mis_clases(
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    """Retorna todas las clases activas del docente en el semestre, ordenadas por día y hora."""
    rows = await horario_model.obtener_todas_clases_docente(db, current_user.user_id)
    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               _DIAS.get(row.dia_semana, ""),
            "dia_semana":        row.dia_semana,
            "hora_inicio":       row.hora_inicio[:5],
            "hora_fin":          row.hora_fin[:5],
            "horario":           f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":              f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":           str(row.aula_id),
            "total_estudiantes": row.total_estudiantes,
        }
        for row in rows
    ]


@router.post("/generar-qr")
async def generar_qr(
    aula_id: str,
    minutos: int,
    horario_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    """Inicia sesión de asistencia: valida que la clase no haya terminado y genera el QR del profesor."""
    row = await horario_model.obtener_hora_fin_clase(db, horario_id)
    if not row:
        raise HTTPException(status_code=404, detail="Clase no encontrada")

    hora_fin = row[0][:5]
    ahora = datetime.now().strftime("%H:%M")
    if ahora > hora_fin:
        raise HTTPException(status_code=400, detail="Esta clase ya terminó")

    if minutos < 5 or minutos > 15:
        raise HTTPException(status_code=400, detail="Los minutos deben estar entre 5 y 15")

    qr_token = create_qr_token(
        current_user.user_id,
        current_user.codigo,
        current_user.role,
        aula_id,
    )
    return {
        "qr_token":   qr_token,
        "expires_in": 30,
        "minutos":    minutos,
        "horario_id": horario_id,
        "aula_id":    aula_id,
    }


@router.get("/asistencia-sesion/{horario_id}")
async def asistencia_sesion(
    horario_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    """Retorna los estudiantes que registraron asistencia en las últimas 2 horas para el horario dado."""
    rows = await asistencia_model.asistencia_sesion_docente(db, horario_id)
    return [
        {
            "nombre":    r.nombre,
            "codigo":    r.codigo,
            "hora":      r.timestamp_in.strftime("%H:%M"),
            "metodo":    r.metodo,
        }
        for r in rows
    ]
