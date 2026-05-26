"""Modelo de reservas de aulas: CRUD y validación de traslapes."""
from uuid import UUID
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def buscar_reserva_usuario_activa(db: AsyncSession, aula_uid: UUID, user_uid: UUID):
    """Verifica si el usuario tiene reserva activa propia en esta aula AHORA."""
    result = await db.execute(text("""
        SELECT id FROM reservas
        WHERE aula_id = :aula_id
          AND user_id = :user_id
          AND estado = 'activa'
          AND inicio <= NOW()
          AND fin    >= NOW()
    """), {"aula_id": aula_uid, "user_id": user_uid})
    return result.fetchone()


async def buscar_reserva_aula_activa(db: AsyncSession, aula_uid: UUID):
    """Verifica si hay cualquier reserva activa en el aula AHORA (entra cualquier usuario)."""
    result = await db.execute(text("""
        SELECT id FROM reservas
        WHERE aula_id = :aula_id
          AND estado = 'activa'
          AND inicio <= NOW()
          AND fin    >= NOW()
    """), {"aula_id": aula_uid})
    return result.fetchone()


async def contar_traslape_reservas(db: AsyncSession, aula_id: str, inicio: datetime, fin: datetime) -> int:
    """Cuenta reservas activas que se traslapan con el rango solicitado."""
    result = await db.execute(text("""
        SELECT COUNT(*) FROM reservas
        WHERE aula_id = :aula_id
        AND estado = 'activa'
        AND inicio < :fin
        AND fin > :inicio
    """), {"aula_id": aula_id, "inicio": inicio, "fin": fin})
    return result.scalar() or 0


async def contar_traslape_clases(
    db: AsyncSession, aula_id: str, dia_semana: int, hora_inicio, hora_fin
) -> int:
    """Cuenta clases programadas que se traslapan con el rango solicitado."""
    result = await db.execute(text("""
        SELECT COUNT(*) FROM horarios
        WHERE aula_id = :aula_id
        AND activo = true
        AND dia_semana = :dia_semana
        AND hora_inicio < :hora_fin
        AND hora_fin > :hora_inicio
    """), {
        "aula_id":    aula_id,
        "dia_semana": dia_semana,
        "hora_inicio": hora_inicio,
        "hora_fin":    hora_fin,
    })
    return result.scalar() or 0


async def crear_reserva(
    db: AsyncSession, user_id: str, aula_id: str, inicio: datetime, fin: datetime
) -> None:
    """Inserta una nueva reserva en estado activa."""
    await db.execute(text("""
        INSERT INTO reservas (user_id, aula_id, inicio, fin, estado)
        VALUES (:user_id, :aula_id, :inicio, :fin, 'activa')
    """), {
        "user_id": user_id,
        "aula_id": aula_id,
        "inicio":  inicio,
        "fin":     fin,
    })
    await db.commit()


async def listar_mis_reservas(db: AsyncSession, user_id: str):
    """Retorna las reservas activas y futuras del usuario."""
    result = await db.execute(text("""
        SELECT r.id, r.inicio, r.fin, r.estado,
               a.nombre as aula, a.edificio, a.codigo as aula_codigo
        FROM reservas r
        JOIN aulas a ON r.aula_id = a.id
        WHERE r.user_id = :user_id
        AND r.estado = 'activa'
        AND r.fin > NOW()
        ORDER BY r.inicio ASC
    """), {"user_id": user_id})
    return result.fetchall()


async def obtener_reserva_para_cancelar(db: AsyncSession, reserva_id: str, user_id: str):
    """Carga una reserva propia activa para validar la cancelación."""
    result = await db.execute(text("""
        SELECT id, inicio FROM reservas
        WHERE id = :id AND user_id = :user_id AND estado = 'activa'
    """), {"id": reserva_id, "user_id": user_id})
    return result.fetchone()


async def cancelar_reserva(db: AsyncSession, reserva_id: str) -> None:
    """Marca la reserva como cancelada."""
    await db.execute(
        text("UPDATE reservas SET estado = 'cancelada' WHERE id = :id"),
        {"id": reserva_id},
    )
    await db.commit()
