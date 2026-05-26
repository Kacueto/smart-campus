"""Modelo de accesos: INSERT en la tabla accesos.

Cada función recibe la sesión async y argumentos primitivos; no levanta HTTPException
ni depende de FastAPI/Pydantic.
"""
import json
import logging
from uuid import UUID
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def registrar_acceso(
    db: AsyncSession,
    user_id,
    aula_id,
    evento: str,
    ip_edge: str | None,
    nonce: str | None = None,
    motivo: str = "",
) -> None:
    """Inserta un evento de acceso (permitido/denegado) en la tabla accesos.

    Usa CAST(:detalle AS jsonb) en vez de :detalle::jsonb porque asyncpg no
    soporta el operador `::` cuando hay parámetros nombrados — interpreta el
    primer `:` como inicio de placeholder y falla con syntax error.
    """
    try:
        await db.execute(text("""
            INSERT INTO accesos (user_id, aula_id, evento, token_nonce, ip_edge, detalle)
            VALUES (:user_id, :aula_id, :evento, :nonce, :ip_edge, CAST(:detalle AS jsonb))
        """), {
            "user_id":  UUID(user_id) if user_id else None,
            "aula_id":  UUID(aula_id) if aula_id else None,
            "evento":   evento,
            "nonce":    nonce,
            "ip_edge":  ip_edge,
            "detalle":  json.dumps({"motivo": motivo}),
        })
        await db.commit()
    except Exception as e:
        logger.error(f"Error registrando acceso: {e}")
        await db.rollback()


async def listar_accesos_recientes(db: AsyncSession, limit: int = 50):
    """Retorna los últimos accesos con datos de usuario y aula para el panel de admin."""
    result = await db.execute(text("""
        SELECT
            ac.id,
            ac.timestamp,
            ac.evento,
            ac.ip_edge,
            ac.detalle,
            u.nombre   as user_nombre,
            u.codigo   as user_codigo,
            u.rol      as user_rol,
            al.nombre  as aula_nombre,
            al.codigo  as aula_codigo
        FROM accesos ac
        LEFT JOIN users u  ON ac.user_id = u.id
        JOIN  aulas  al ON ac.aula_id = al.id
        ORDER BY ac.timestamp DESC
        LIMIT :limit
    """), {"limit": limit})
    return result.fetchall()


async def contar_accesos_ultimas_24h(db: AsyncSession):
    """Cuenta accesos permitidos y denegados en las últimas 24 horas."""
    result = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE evento = 'permitido') as permitidos,
            COUNT(*) FILTER (WHERE evento = 'denegado')  as denegados
        FROM accesos
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
    """))
    return result.fetchone()
