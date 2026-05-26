"""Modelo de horarios e inscripciones: queries para validar derecho de acceso
en aulas, listar clases del estudiante y del docente."""
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def buscar_clase_activa_estudiante(db: AsyncSession, aula_uid: UUID, user_uid: UUID):
    """Verifica si el estudiante tiene clase inscrita en esta aula AHORA (hora Bogotá)."""
    result = await db.execute(text("""
        SELECT h.id as horario_id
        FROM horarios h
        JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.aula_id = :aula_id
          AND i.user_id = :user_id
          AND h.activo = true
          AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
          AND h.hora_inicio <= (NOW() AT TIME ZONE 'America/Bogota')::time
          AND h.hora_fin    >= (NOW() AT TIME ZONE 'America/Bogota')::time
    """), {"aula_id": aula_uid, "user_id": user_uid})
    return result.fetchone()


async def buscar_clase_activa_docente(db: AsyncSession, aula_uid: UUID, user_uid: UUID):
    """Verifica si el docente tiene clase asignada en esta aula AHORA (hora Bogotá)."""
    result = await db.execute(text("""
        SELECT h.id as horario_id
        FROM horarios h
        WHERE h.aula_id = :aula_id
          AND h.docente_id = :user_id
          AND h.activo = true
          AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
          AND h.hora_inicio <= (NOW() AT TIME ZONE 'America/Bogota')::time
          AND h.hora_fin    >= (NOW() AT TIME ZONE 'America/Bogota')::time
    """), {"aula_id": aula_uid, "user_id": user_uid})
    return result.fetchone()


async def obtener_mis_clases(db: AsyncSession, user_id: str):
    """Retorna el horario semanal completo del estudiante (todas sus inscripciones activas)."""
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
    """), {"user_id": user_id})
    return result.fetchall()


async def obtener_clases_hoy_docente(db: AsyncSession, docente_id: str):
    """Retorna las clases del docente para el día actual (hora Bogotá)."""
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
            COUNT(i.user_id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id
        AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
        AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.hora_inicio
    """), {"docente_id": docente_id})
    return result.fetchall()


async def obtener_todas_clases_docente(db: AsyncSession, docente_id: str):
    """Retorna todas las clases activas del docente en el semestre."""
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
            COUNT(i.user_id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.dia_semana, h.hora_inicio
    """), {"docente_id": docente_id})
    return result.fetchall()


async def obtener_hora_fin_clase(db: AsyncSession, horario_id: str):
    """Retorna la hora de fin de la clase para validar que aún esté vigente."""
    result = await db.execute(
        text("SELECT hora_fin::text FROM horarios WHERE id = :id"),
        {"id": horario_id},
    )
    return result.fetchone()


async def listar_horarios_admin(db: AsyncSession):
    """Retorna todos los horarios del semestre con datos del docente y el aula."""
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            h.activo,
            u.nombre  as docente,
            u.codigo  as docente_codigo,
            a.nombre  as aula,
            a.codigo  as aula_codigo,
            a.edificio,
            COUNT(i.user_id) as total_inscritos
        FROM horarios h
        JOIN users u ON h.docente_id = u.id
        JOIN aulas a ON h.aula_id    = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        GROUP BY h.id, u.id, a.id
        ORDER BY h.dia_semana, h.hora_inicio
    """))
    return result.fetchall()
