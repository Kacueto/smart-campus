"""Modelo de usuarios: queries para acceso (acceso_controller), admin y stats.

La clase SQLAlchemy `User` sigue en app/models/user.py (usada por auth_controller).
Estas funciones encapsulan las queries SQL directas.
"""
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def obtener_por_id(db: AsyncSession, user_uid: UUID):
    """Carga datos básicos del usuario para validación de acceso (id, nombre, codigo, rol, activo)."""
    result = await db.execute(
        text("SELECT id, nombre, codigo, rol, activo FROM users WHERE id = :id"),
        {"id": user_uid},
    )
    return result.fetchone()


async def listar_usuarios(db: AsyncSession):
    result = await db.execute(text("""
        SELECT id, codigo, nombre, email, rol, activo, created_at
        FROM users
        ORDER BY rol, nombre
    """))
    return result.fetchall()


async def existe_usuario(db: AsyncSession, codigo: str, email: str) -> bool:
    result = await db.execute(
        text("SELECT id FROM users WHERE codigo = :codigo OR email = :email"),
        {"codigo": codigo, "email": email},
    )
    return result.fetchone() is not None


async def crear_usuario(
    db: AsyncSession,
    codigo: str,
    nombre: str,
    email: str,
    password_hash: str,
    rol: str,
) -> str:
    result = await db.execute(text("""
        INSERT INTO users (codigo, nombre, email, password, rol)
        VALUES (:codigo, :nombre, :email, :password, :rol)
        RETURNING id
    """), {
        "codigo":   codigo,
        "nombre":   nombre,
        "email":    email,
        "password": password_hash,
        "rol":      rol,
    })
    await db.commit()
    return str(result.fetchone().id)


async def toggle_activo(db: AsyncSession, user_id: str):
    """Invierte el flag activo del usuario y retorna el nuevo valor (o None si no existe)."""
    result = await db.execute(
        text("UPDATE users SET activo = NOT activo WHERE id = :id RETURNING activo"),
        {"id": UUID(user_id)},
    )
    row = result.fetchone()
    if row:
        await db.commit()
    return row


async def stats_usuarios_por_rol(db: AsyncSession):
    """Resumen para el dashboard admin: totales y activos por rol."""
    result = await db.execute(text("""
        SELECT rol, COUNT(*) as total, COUNT(*) FILTER (WHERE activo) as activos
        FROM users GROUP BY rol
    """))
    return result.fetchall()
