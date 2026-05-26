"""Controlador de horarios: retorna el horario del estudiante autenticado."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.views.auth_view import TokenData
from app.models import horario_model

router = APIRouter(prefix="/horarios", tags=["Horarios"])

_DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles",
         4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


@router.get("/mis-clases")
async def mis_clases(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna el horario semanal completo del estudiante autenticado, ordenado por día y hora."""
    rows = await horario_model.obtener_mis_clases(db, current_user.user_id)

    return [
        {
            "id":           str(row.id),
            "materia":      row.materia,
            "dia_semana":   row.dia_semana,
            "dia":          _DIAS[row.dia_semana],
            "hora_inicio":  row.hora_inicio[:5],
            "hora_fin":     row.hora_fin[:5],
            "horario":      f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":         f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":      str(row.aula_id),
            "aula_codigo":  row.aula_codigo,
            "profesor":     row.profesor,
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin":    row.fecha_fin,
        }
        for row in rows
    ]
