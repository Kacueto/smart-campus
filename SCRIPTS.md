# Scripts y comandos para levantar Smart Campus

Este archivo reúne los comandos y scripts más usados para levantar el entorno de desarrollo del proyecto Smart Campus.

> Notas rápidas:
- Ejecuta estos comandos desde la raíz del proyecto (~/Projects/smart-campus).
- Usa WSL2/Ubuntu (se probó en WSL2). Si trabajas en macOS/Linux los comandos son iguales; en Windows usa WSL.

## Pre-requisitos
- Docker & Docker Compose
- Python 3.12 (backend) y Node.js/npm (frontend)
- `git` y red local (puertos libres para 8000, 5173, 5432, 6379)

---

## 1) Levantar sólo servicios de infra (Postgres + Redis)

```bash
cd ~/Projects/smart-campus
docker compose up postgres redis -d
```

Comprueba contenedores:

```bash
docker compose ps
```

---

## 2) Inicializar base de datos (si necesitas correr el script `init.sql` localmente)

```bash
# desde la raíz del proyecto (requiere psql instalado localmente)
psql -h localhost -p 5432 -U scadmin -d smartcampus -f database/postgres/init.sql
```

Si prefieres ejecutarlo dentro del contenedor (ajusta el servicio `postgres` si usa otro nombre):

```bash
docker compose exec -T postgres psql -U scadmin -d smartcampus -f /docker-entrypoint-initdb.d/init.sql
```

---

## 3) Backend — entorno virtual y servidor de desarrollo

Instalación (primera vez):

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Levantar backend (desarrollo):

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Comando todo-en-uno (desde raíz, útil en una terminal):

```bash
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000
```

---

## 4) Frontend — instalar dependencias y servidor de desarrollo

Instalación (primera vez):

```bash
cd frontend
npm install
```

Levantar frontend (dev):

```bash
cd frontend
npm run dev
```

Por defecto la app estará en `http://localhost:5173`.

---

## 5) Edge node (Raspberry Pi 5) — notas rápidas

El nodo edge corre nativo en la Pi (no usar Docker). Ejemplo de pasos:

```bash
# en la Pi, dentro de la carpeta edge/ correspondiente
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # si existe
python run_edge.py                # script de ejemplo para iniciar lector QR + GPIO
```

Revisa `edge/` para los scripts concretos: `edge/qr_scanner`, `edge/mqtt_client`, etc.

---

## 6) Comando rápido para levantar todo en desarrollo (requiere 3 terminales)

Terminal 1: infra
```bash
cd ~/Projects/smart-campus
docker compose up postgres redis -d
```

Terminal 2: backend
```bash
cd ~/Projects/smart-campus/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Terminal 3: frontend
```bash
cd ~/Projects/smart-campus/frontend
npm run dev
```

---

## 7) Parar servicios

```bash
# Detener contenedores
docker compose down

# (opcional) cerrar backend/uvicorn y frontend procesos con Ctrl+C en sus terminales
```

---

## 8) Variables de entorno y certificados
- Certificados JWT (RS256): `infra/certs/private.pem`, `infra/certs/public.pem` — asegúrate de que el backend tenga la ruta correcta.
- DB/Redis (ejemplo):

```bash
export DATABASE_URL=postgresql+asyncpg://scadmin:scpassword123@localhost:5432/smartcampus
export REDIS_URL=redis://:redispassword123@localhost:6379/0
```

Coloca variables en un `.env` si prefieres y carga con `python-dotenv` en el backend.

---

## 9) Consejos y problemas comunes
- Siempre activar `venv` antes de ejecutar `uvicorn`.
- `bcrypt` debe ser `4.0.1` (ver `requirements.txt`).
- Si la Pi no está en la misma red, ajusta `REDIS_URL`/`DATABASE_URL` y la configuración CORS.
- Para producción crea `Dockerfile` y compose services separados (pendiente en la hoja de ruta).

---

Si quieres, convierto estos comandos en scripts ejecutables (`scripts/*.sh`) o un `Makefile` para poder lanzarlos con `make dev`.
