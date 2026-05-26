"""Wrapper de arranque para el edge node en Docker (modo simulate).

Las aulas se crean con UUIDs aleatorios (uuid_generate_v4) en el seed de
PostgreSQL, así que este script consulta la BD al iniciar para resolver
el UUID del aula a partir de su código y luego exec(main.py --simulate).

Variables de entorno:
    AULA_CODIGO   código del aula (ej. AULA-101)
    DATABASE_URL  postgresql://user:pass@host:port/db
    BACKEND_URL   URL del backend (ej. http://backend:8000)
    MQTT_HOST     host del broker MQTT
    EDGE_IP       IP del edge a reportar al backend

Se usa solo en docker compose --profile simulate. En la Pi 5 real
se sigue ejecutando main.py directamente con --aula-uuid.
"""
import os
import sys
import time
import psycopg2

AULA_CODIGO = os.environ.get("AULA_CODIGO", "AULA-101")
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://scadmin:scpassword123@postgres:5432/smartcampus",
)
BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:8000")
MQTT_HOST   = os.environ.get("MQTT_HOST", "mosquitto")
EDGE_IP     = os.environ.get("EDGE_IP", "172.18.0.99")

MAX_RETRIES   = 30
RETRY_DELAY_S = 2


def resolve_aula_uuid(codigo: str) -> str:
    """Espera a que Postgres acepte conexiones y devuelve el UUID del aula."""
    for intento in range(1, MAX_RETRIES + 1):
        try:
            with psycopg2.connect(DATABASE_URL) as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT id FROM aulas WHERE codigo = %s", (codigo,))
                    row = cur.fetchone()
                    if row:
                        return str(row[0])
                    print(f"[bootstrap] aula no encontrada: {codigo}", flush=True)
                    sys.exit(2)
        except psycopg2.OperationalError as e:
            print(f"[bootstrap] postgres aún no responde ({intento}/{MAX_RETRIES}): {e}", flush=True)
            time.sleep(RETRY_DELAY_S)
    print("[bootstrap] timeout esperando a postgres", flush=True)
    sys.exit(3)


def main() -> None:
    uuid = resolve_aula_uuid(AULA_CODIGO)
    print(f"[bootstrap] {AULA_CODIGO} → {uuid}", flush=True)

    args = [
        sys.executable, "/app/main.py",
        "--aula",      AULA_CODIGO,
        "--aula-uuid", uuid,
        "--backend",   BACKEND_URL,
        "--mqtt-host", MQTT_HOST,
        "--ip",        EDGE_IP,
        "--simulate",
    ]
    os.execvp(args[0], args)


if __name__ == "__main__":
    main()
