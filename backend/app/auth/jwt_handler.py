import os
import jwt
import uuid
import redis
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from app.auth.schemas import TokenData, UserRole

# Cargar claves RS256. La ruta puede sobreescribirse con CERTS_DIR para
# poder montar las llaves dentro del contenedor en otra ubicacion.
CERTS_DIR = Path(os.getenv("CERTS_DIR", "../infra/certs"))
PRIVATE_KEY = (CERTS_DIR / "private.pem").read_text()
PUBLIC_KEY  = (CERTS_DIR / "public.pem").read_text()

ALGORITHM                  = "RS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
QR_TOKEN_EXPIRE_SECONDS     = 30

# Redis para blacklist. Se puede apuntar al servicio docker con REDIS_URL.
REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://:redispassword123@localhost:6379/0",
)
redis_client = redis.from_url(REDIS_URL, decode_responses=True)

# ----------------------------------------------------------
# Generar access token (login)
# ----------------------------------------------------------
def create_access_token(user_id: str, codigo: str, role: str) -> str:
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
# ----------------------------------------------------------
def create_qr_token(user_id: str, codigo: str, role: str, aula_id: str) -> str:
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
    return jwt.encode(payload, PRIVATE_KEY, algorithm=ALGORITHM)

# ----------------------------------------------------------
# Verificar cualquier token
# ----------------------------------------------------------
def verify_token(token: str) -> Optional[dict]:
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
                return None
            # Marcar nonce como usado (expira en 60s)
            redis_client.setex(f"nonce:{nonce}", 60, "used")

        return payload

    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

# ----------------------------------------------------------
# Revocar token (logout / blacklist)
# ----------------------------------------------------------
def revoke_token(jti: str, expire_minutes: int = ACCESS_TOKEN_EXPIRE_MINUTES):
    redis_client.setex(f"blacklist:{jti}", expire_minutes * 60, "revoked")
