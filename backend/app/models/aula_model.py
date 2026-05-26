"""Modelo de aulas: CRUD + búsqueda de aulas disponibles para reserva."""
from datetime import datetime, time
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def listar_aulas_disponibles(
    db: AsyncSession,
    dia_semana: int,
    hora_inicio: time,
    hora_fin: time,
    inicio_dt: datetime,
    fin_dt: datetime,
):
    """Aulas sin clase ni reserva activa en el rango fecha/hora solicitado."""
    result = await db.execute(text("""
        SELECT a.id, a.codigo, a.nombre, a.edificio, a.capacidad
        FROM aulas a
        WHERE a.activa = true
        AND a.id NOT IN (
            SELECT h.aula_id FROM horarios h
            WHERE h.dia_semana = :dia_semana
            AND h.activo = true
            AND h.hora_inicio < :hora_fin
            AND h.hora_fin    > :hora_inicio
        )
        AND a.id NOT IN (
            SELECT r.aula_id FROM reservas r
            WHERE r.estado = 'activa'
            AND r.inicio < :fin
            AND r.fin    > :inicio
        )
        ORDER BY a.edificio, a.nombre
    """), {
        "dia_semana":  dia_semana,
        "hora_inicio": hora_inicio,
        "hora_fin":    hora_fin,
        "inicio":      inicio_dt,
        "fin":         fin_dt,
    })
    return result.fetchall()


async def listar_aulas_admin(db: AsyncSession):
    """Listado completo de aulas con total de horarios para el panel admin."""
    result = await db.execute(text("""
        SELECT
            a.id, a.codigo, a.nombre, a.edificio, a.capacidad, a.activa,
            COUNT(DISTINCT h.id) as total_horarios
        FROM aulas a
        LEFT JOIN horarios h ON h.aula_id = a.id AND h.activo = true
        GROUP BY a.id
        ORDER BY a.edificio, a.nombre
    """))
    return result.fetchall()


async def existe_aula_por_codigo(db: AsyncSession, codigo: str) -> bool:
    result = await db.execute(
        text("SELECT id FROM aulas WHERE codigo = :codigo"),
        {"codigo": codigo},
    )
    return result.fetchone() is not None


async def crear_aula(
    db: AsyncSession, codigo: str, nombre: str, edificio: str | None, capacidad: int
) -> str:
    result = await db.execute(text("""
        INSERT INTO aulas (codigo, nombre, edificio, capacidad)
        VALUES (:codigo, :nombre, :edificio, :capacidad)
        RETURNING id
    """), {
        "codigo":    codigo,
        "nombre":    nombre,
        "edificio":  edificio,
        "capacidad": capacidad,
    })
    await db.commit()
    return str(result.fetchone().id)


async def contar_aulas_activas(db: AsyncSession) -> int:
    result = await db.execute(text("SELECT COUNT(*) FROM aulas WHERE activa = true"))
    return result.scalar() or 0
