# syntax=docker/dockerfile:1
FROM python:3.12-slim

# Variables que ayudan a tener logs en tiempo real y un entorno mas predecible
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Dependencias del sistema necesarias para compilar algunos paquetes (cryptography, asyncpg)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# WORKDIR == /app/backend para que Path("../infra/certs/...") siga funcionando
# si docker-compose monta el repo con la misma estructura.
WORKDIR /app/backend

# Instalamos requirements primero para aprovechar la cache
COPY requirements.txt .
RUN pip install -r requirements.txt

# Copiamos el codigo (en dev se sobreescribe con bind mount)
COPY . .

EXPOSE 8000

# --host 0.0.0.0 para escuchar en todas las interfaces del contenedor.
# --reload-dir app/ evita que watchfiles intente vigilar venv/, __pycache__, etc.
# (causa del "Cannot allocate memory" cuando inotify se queda sin watchers).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload", "--reload-dir", "app"]
