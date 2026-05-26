"""Modelo de asistencia: INSERT al validar QR + estadísticas para estudiante y docente."""
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def registrar_asistencia_qr(
    db: AsyncSession, user_uid: UUID, aula_uid: UUID, horario_uid: UUID
) -> None:
    """Inserta un registro de asistencia válido para una clase oficial."""
    await db.execute(text("""
        INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
        VALUES (:user_id, :aula_id, :horario_id, NOW(), 'qr', true)
    """), {"user_id": user_uid, "aula_id": aula_uid, "horario_id": horario_uid})


async def contar_clases_semana_estudiante(db: AsyncSession, user_id: str) -> int:
    """Cuenta el número de clases por semana del estudiante (inscripciones activas)."""
    result = await db.execute(text("""
        SELECT COUNT(*) as total
        FROM inscripciones i
        JOIN horarios h ON i.horario_id = h.id
        WHERE i.user_id = :user_id AND h.activo = true
    """), {"user_id": user_id})
    return result.scalar() or 0


async def contar_asistencias_validas(db: AsyncSession, user_id: str) -> int:
    """Cuenta las asistencias históricas válidas del estudiante."""
    result = await db.execute(text("""
        SELECT COUNT(*) FROM asistencia
        WHERE user_id = :user_id AND valido = true
    """), {"user_id": user_id})
    return result.scalar() or 0


async def semanas_transcurridas_desde_inicio(db: AsyncSession, user_id: str) -> int:
    """Calcula cuántas semanas han pasado desde el inicio del semestre del estudiante."""
    result = await db.execute(text("""
        SELECT GREATEST(1, FLOOR(
            EXTRACT(EPOCH FROM (NOW() - MIN(fecha_inicio))) / 604800
        ))
        FROM horarios h
        JOIN inscripciones i ON i.horario_id = h.id
        WHERE i.user_id = :user_id AND h.activo = true
    """), {"user_id": user_id})
    return int(result.scalar() or 1)


async def ultimas_asistencias_estudiante(db: AsyncSession, user_id: str, limit: int = 5):
    """Retorna las últimas N asistencias del estudiante para la sección 'historial'."""
    result = await db.execute(text("""
        SELECT h.materia, a.nombre as aula, at.timestamp_in
        FROM asistencia at
        JOIN horarios h ON at.horario_id = h.id
        JOIN aulas a ON at.aula_id = a.id
        WHERE at.user_id = :user_id AND at.valido = true
        ORDER BY at.timestamp_in DESC
        LIMIT :limit
    """), {"user_id": user_id, "limit": limit})
    return result.fetchall()


async def asistencia_sesion_docente(db: AsyncSession, horario_id: str):
    """Retorna los estudiantes presentes en la sesión activa de las últimas 2 horas."""
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
    return result.fetchall()


async def total_asistencias_validas(db: AsyncSession) -> int:
    """Total global de asistencias para el dashboard admin."""
    result = await db.execute(text(
        "SELECT COUNT(*) FROM asistencia WHERE valido = true"
    ))
    return result.scalar() or 0
