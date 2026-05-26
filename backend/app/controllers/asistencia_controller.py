"""Controlador de asistencia del estudiante: porcentaje + últimas 5 entradas."""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.views.auth_view import TokenData
from app.models import asistencia_model

router = APIRouter(prefix="/asistencia", tags=["Asistencia"])


@router.get("/mis-estadisticas")
async def mis_estadisticas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Calcula el porcentaje de asistencia del estudiante y retorna sus últimas 5 entradas."""
    user_id = current_user.user_id

    clases_semana = await asistencia_model.contar_clases_semana_estudiante(db, user_id)
    total_asistidas = await asistencia_model.contar_asistencias_validas(db, user_id)
    semanas_transcurridas = await asistencia_model.semanas_transcurridas_desde_inicio(db, user_id)

    esperadas = clases_semana * semanas_transcurridas
    porcentaje = round((total_asistidas / esperadas) * 100) if esperadas > 0 else 0
    porcentaje = min(porcentaje, 100)

    ultimas_rows = await asistencia_model.ultimas_asistencias_estudiante(db, user_id, limit=5)

    return {
        "porcentaje":      f"{porcentaje}%",
        "total_asistidas": total_asistidas,
        "esperadas":       esperadas,
        "clases_semana":   clases_semana,
        "ultimas": [
            {
                "materia":   r.materia,
                "aula":      r.aula,
                "timestamp": r.timestamp_in.strftime("%d/%m/%Y %H:%M"),
            }
            for r in ultimas_rows
        ],
    }
