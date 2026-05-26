#!/bin/sh
# Genera el par de claves RS256 si no existen y arranca uvicorn.
# Hace que `docker compose up` funcione en limpio sin requerir que el
# usuario cree los certificados a mano.

set -e

CERT_DIR="${CERT_DIR:-/certs}"
PRIVATE_KEY="${JWT_PRIVATE_KEY_PATH:-$CERT_DIR/private.pem}"
PUBLIC_KEY="${JWT_PUBLIC_KEY_PATH:-$CERT_DIR/public.pem}"

if [ ! -s "$PRIVATE_KEY" ] || [ ! -s "$PUBLIC_KEY" ]; then
    echo "[entrypoint] No se encontraron certificados RS256, generando en $CERT_DIR ..."
    mkdir -p "$CERT_DIR"
    python - <<PYEOF
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
priv = key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption(),
)
pub = key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo,
)
open("${PRIVATE_KEY}", "wb").write(priv)
open("${PUBLIC_KEY}", "wb").write(pub)
print("[entrypoint] Certificados generados.")
PYEOF
else
    echo "[entrypoint] Usando certificados existentes en $CERT_DIR."
fi

exec uvicorn app.main:app --host 0.0.0.0 --port 8000
