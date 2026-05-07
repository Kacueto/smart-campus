from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import TokenData

router = APIRouter(prefix="/asistencia", tags=["Asistencia"])

@router.get("/mis-estadisticas")
async def mis_estadisticas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Total de clases por semana (inscripciones)
    total = await db.execute(text("""
        SELECT COUNT(*) as total
        FROM inscripciones i
        JOIN horarios h ON i.horario_id = h.id
        WHERE i.user_id = :user_id AND h.activo = true
    """), {"user_id": current_user.user_id})
    clases_semana = total.scalar() or 0

    # Total asistidas históricas
    historico = await db.execute(text("""
        SELECT COUNT(*) FROM asistencia
        WHERE user_id = :user_id AND valido = true
    """), {"user_id": current_user.user_id})
    total_asistidas = historico.scalar() or 0

    # Clases esperadas en el semestre (semanas transcurridas * clases por semana)
    semanas = await db.execute(text("""
        SELECT GREATEST(1, FLOOR(
            EXTRACT(EPOCH FROM (NOW() - MIN(fecha_inicio))) / 604800
        ))
        FROM horarios h
        JOIN inscripciones i ON i.horario_id = h.id
        WHERE i.user_id = :user_id AND h.activo = true
    """), {"user_id": current_user.user_id})
    semanas_transcurridas = int(semanas.scalar() or 1)
    esperadas = clases_semana * semanas_transcurridas

    porcentaje = round((total_asistidas / esperadas) * 100) if esperadas > 0 else 0
    porcentaje = min(porcentaje, 100)

    # Últimas 5 asistencias
    ultimas = await db.execute(text("""
        SELECT h.materia, a.nombre as aula, at.timestamp_in
        FROM asistencia at
        JOIN horarios h ON at.horario_id = h.id
        JOIN aulas a ON at.aula_id = a.id
        WHERE at.user_id = :user_id AND at.valido = true
        ORDER BY at.timestamp_in DESC
        LIMIT 5
    """), {"user_id": current_user.user_id})

    ultimas_rows = ultimas.fetchall()

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
        ]
    }
