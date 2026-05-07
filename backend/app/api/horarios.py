from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import TokenData

router = APIRouter(prefix="/horarios", tags=["Horarios"])

@router.get("/mis-clases")
async def mis_clases(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(text("""
        SELECT 
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            h.fecha_inicio::text,
            h.fecha_fin::text,
            a.id as aula_id,
            a.nombre as aula,
            a.edificio,
            a.codigo as aula_codigo,
            u.nombre as profesor
        FROM inscripciones i
        JOIN horarios h ON i.horario_id = h.id
        JOIN aulas a ON h.aula_id = a.id
        JOIN users u ON h.docente_id = u.id
        WHERE i.user_id = :user_id
        AND h.activo = true
        ORDER BY h.dia_semana, h.hora_inicio
    """), {"user_id": current_user.user_id})

    rows = result.fetchall()

    dias = {1: "Lunes", 2: "Martes", 3: "Miércoles",
            4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}

    clases = []
    for row in rows:
        clases.append({
            "id":           str(row.id),
            "materia":      row.materia,
            "dia_semana":   row.dia_semana,
            "dia":          dias[row.dia_semana],
            "hora_inicio":  row.hora_inicio[:5],
            "hora_fin":     row.hora_fin[:5],
            "horario":      f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":         f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":      str(row.aula_id),
            "aula_codigo":  row.aula_codigo,
            "profesor":     row.profesor,
            "fecha_inicio": row.fecha_inicio,
            "fecha_fin":    row.fecha_fin,
        })

    return clases
