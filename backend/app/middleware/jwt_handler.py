import jwt
import uuid
import redis
import logging
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from app.schemas.auth import TokenData, UserRole

logger = logging.getLogger(__name__)

# Cargar claves RS256
PRIVATE_KEY = Path("../infra/certs/private.pem").read_text()
PUBLIC_KEY  = Path("../infra/certs/public.pem").read_text()

ALGORITHM                  = "RS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
QR_TOKEN_EXPIRE_SECONDS     = 30

# Redis para blacklist
redis_client = redis.from_url("redis://:redispassword123@localhost:6379/0", decode_responses=True)

# ----------------------------------------------------------
# Generar access token (login)
# ----------------------------------------------------------
def create_access_token(user_id: str, codigo: str, role: str) -> str:
    """Genera un JWT RS256 de acceso con TTL de 30 minutos."""
    jti = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub":    user_id,
        "codigo": codigo,
        "role":   role,
        "jti":    jti,
        "exp":    expire,
        "type":   "access",
    }
    return jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)

# ----------------------------------------------------------
# Generar QR token (TTL 30s + nonce anti-replay)
# Retorna un código corto de 12 chars que apunta al JWT en Redis
# ----------------------------------------------------------
def create_qr_token(user_id: str, codigo: str, role: str, aula_id: str) -> str:
    """Genera un short code de 12 chars que apunta al JWT QR almacenado en Redis (TTL 30s)."""
    jti    = str(uuid.uuid4())
    nonce  = str(uuid.uuid4())
    expire = datetime.now(timezone.utc) + timedelta(seconds=QR_TOKEN_EXPIRE_SECONDS)
    payload = {
        "sub":     user_id,
        "codigo":  codigo,
        "role":    role,
        "aula_id": aula_id,
        "jti":     jti,
        "nonce":   nonce,
        "exp":     expire,
        "type":    "qr",
    }
    full_jwt = jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)

    # Guardar JWT en Redis con clave corta (12 chars)
    short_code = uuid.uuid4().hex[:12].upper()
    redis_client.setex(f"qr:{short_code}", QR_TOKEN_EXPIRE_SECONDS + 5, full_jwt)

    return short_code


def resolve_qr_token(short_code: str) -> Optional[str]:
    """Resuelve un código corto al JWT completo."""
    return redis_client.get(f"qr:{short_code}")

# ----------------------------------------------------------
# Verificar cualquier token
# ----------------------------------------------------------
def verify_token(token: str) -> Optional[dict]:
    """Verifica firma RS256, blacklist y nonce anti-replay. Retorna payload o None si inválido."""
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=[ALGORITHM])

        # Verificar blacklist
        jti = payload.get("jti")
        if jti and redis_client.exists(f"blacklist:{jti}"):
            return None

        # Si es QR, verificar nonce (anti-replay)
        if payload.get("type") == "qr":
            nonce = payload.get("nonce")
            if redis_client.exists(f"nonce:{nonce}"):
                logger.warning(f"verify_token: nonce ya usado → {nonce[:8]}...")
                return None
            # Marcar nonce como usado (expira en 60s)
            redis_client.setex(f"nonce:{nonce}", 60, "used")

        return payload

    except jwt.ExpiredSignatureError as e:
        logger.warning(f"verify_token: token expirado → {e}")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"verify_token: token inválido → {e}")
        return None

# ----------------------------------------------------------
# Revocar token (logout / blacklist)
# ----------------------------------------------------------
def revoke_token(jti: str, expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    """Agrega el JTI a la blacklist de Redis para invalidar el token en logout."""
    redis_client.setex(f"blacklist:{jti}", expire_minutes * 60, "revoked")
