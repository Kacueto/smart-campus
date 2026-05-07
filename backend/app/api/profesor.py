from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth.dependencies import get_current_user, require_role
from app.auth.schemas import TokenData, UserRole
from app.auth.jwt_handler import create_qr_token

router = APIRouter(prefix="/profesor", tags=["Profesor"])

@router.get("/mis-clases-hoy")
async def mis_clases_hoy(
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            a.nombre as aula,
            a.edificio,
            a.codigo as aula_codigo,
            a.id as aula_id,
            COUNT(i.id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id
        AND h.dia_semana = EXTRACT(ISODOW FROM NOW())::int
        AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.hora_inicio
    """), {"docente_id": current_user.user_id})

    rows = result.fetchall()
    dias = {1: "Lunes", 2: "Martes", 3: "Miércoles",
            4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}

    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               dias.get(row.dia_semana, ""),
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
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            a.nombre as aula,
            a.edificio,
            a.id as aula_id,
            COUNT(i.id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.dia_semana, h.hora_inicio
    """), {"docente_id": current_user.user_id})

    rows = result.fetchall()
    dias = {1: "Lunes", 2: "Martes", 3: "Miércoles",
            4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}

    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               dias.get(row.dia_semana, ""),
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
    # Verificar que la clase no haya terminado
    from datetime import datetime
    ahora = datetime.now().strftime("%H:%M")
    
    from sqlalchemy import text as sql_text
    horario = await db.execute(sql_text("SELECT hora_fin::text FROM horarios WHERE id = :id"), {"id": horario_id})
    row = horario.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    hora_fin = row[0][:5]
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
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(text("""
        SELECT
            u.nombre,
            u.codigo,
            at.timestamp_in,
            at.metodo
        FROM asistencia at
        JOIN users u ON at.user_id = u.id
        WHERE at.horario_id = :horario_id
        AND at.timestamp_in >= NOW() - INTERVAL '2 hours'
        AND at.valido = true
        ORDER BY at.timestamp_in DESC
    """), {"horario_id": horario_id})

    rows = result.fetchall()
    return [
        {
            "nombre":    r.nombre,
            "codigo":    r.codigo,
            "hora":      r.timestamp_in.strftime("%H:%M"),
            "metodo":    r.metodo,
        }
        for r in rows
    ]
