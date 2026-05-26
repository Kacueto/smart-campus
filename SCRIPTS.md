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

## 5) Edge node (Raspberry Pi 5)

**UUIDs de aulas:**
| Código | UUID |
|--------|------|
| AULA-101 | `a4d2dabe-b36e-4bc5-bbcb-4d747c4fb730` |
| AULA-202 | `1f19ea0a-3aa9-4d83-927e-eca38a8b79d6` |
| LAB-301  | `1a18ebbd-c718-465a-8b44-87ff1b529be7` |

### 5a) Copiar archivos actualizados a la Pi (desde WSL2)

```bash
scp ~/Projects/smart-campus/edge/main.py kevin@smartcampus.local:~/edge/
scp -r ~/Projects/smart-campus/infra/certs kevin@smartcampus.local:~/infra/
```

### 5b) Exponer el backend al la Pi (desde PowerShell Admin en Windows)

```powershell
# Obtener IP de WSL2 primero (en WSL2):
# hostname -I | awk '{print $1}'

# Reemplaza <WSL2_IP> con el resultado (ej: 172.17.103.168)
netsh interface portproxy add v4tov4 listenaddress=192.168.1.15 listenport=8000 connectaddress=<WSL2_IP> connectport=8000
New-NetFirewallRule -DisplayName "WSL2 Backend 8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Any
```

Verificar reglas activas:
```powershell
netsh interface portproxy show all
```

Verificar desde la Pi:
```bash
curl http://192.168.1.15:8000/
# Debe responder: {"status":"ok","proyecto":"Smart Campus"}
```

### 5c) Levantar backend accesible desde la red (WSL2)

```bash
cd ~/Projects/smart-campus/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
```

### 5d) Correr edge node en la Pi — modo simulación (sin cámara)

```bash
# En la Pi (SSH)
source ~/edge/venv/bin/activate
python3 ~/edge/main.py \
  --aula AULA-101 \
  --aula-uuid a4d2dabe-b36e-4bc5-bbcb-4d747c4fb730 \
  --backend http://192.168.1.15:8000 \
  --simulate
```

En el simulador:
- `QR profesor>` — pega el token del profesor (login como DOC001)
- `QR estudiante>` — pega el token del estudiante
- `cerrar` — cierra la sesión manualmente

### 5e) Correr edge node en la Pi — modo cámara real

```bash
# Conecta la webcam USB antes de correr
source ~/edge/venv/bin/activate
python3 ~/edge/main.py \
  --aula AULA-101 \
  --aula-uuid a4d2dabe-b36e-4bc5-bbcb-4d747c4fb730 \
  --backend http://192.168.1.15:8000
```

Muestra el QR del frontend frente a la cámara. El QR se renueva cada 30s automáticamente.

### 5f) Verificar cámara detectada en la Pi

```bash
ls /dev/video*
# Debe aparecer /dev/video0 u otro índice
```

Si no aparece, desconecta y vuelve a conectar la webcam USB.

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

---

## 10) Modo Docker simulate (todo dockerizado — un solo comando)

Levanta postgres + redis + mosquitto + backend + frontend + edge-simulator en contenedores.
El edge simulado no usa GPIO ni cámara: lee QRs por `input()` interactivo.

### 10a) Levantar todo (primera vez)

```bash
# Construir imágenes y levantar todo en background
docker compose --profile simulate up -d --build

# Ver estado
docker compose ps
```

Todo lo necesario se hace automáticamente:
- ✅ Postgres se inicializa con `init.sql` (usuarios, aulas, horarios, asistencias seed)
- ✅ Redis y Mosquitto arrancan
- ✅ Backend genera las claves RS256 en `./infra/certs/` si no existen (vía `entrypoint.sh`)
- ✅ Backend arranca uvicorn → healthy en ~20s
- ✅ Frontend Vite se sirve en http://localhost:5173

Verificación:
```bash
curl http://localhost:8000/        # {"status":"ok","proyecto":"Smart Campus","arquitectura":"MVC"}
curl -I http://localhost:5173/     # 200 OK
```

### 10b) Probar el flujo del QR end-to-end

Edge-simulator se arranca interactivo (necesita stdin):

```bash
docker compose --profile simulate run --rm edge-simulator
```

Aparece:
```
============================================================
  SIMULADOR EDGE NODE — Smart Campus
  Aula: AULA-101
  Ctrl+C para salir.
============================================================
[bootstrap] AULA-101 → <uuid resuelto desde postgres>
[ Esperando QR del profesor para abrir sesión ]
QR profesor>
```

Flujo:
1. Abre el navegador en `http://localhost:5173` → login `DOC001 / 1234`
2. Selecciona una clase del día → genera QR → copia el short code (12 chars)
3. Pégalo en `QR profesor>` → sesión abierta
4. Login como `2024001 / 1234` (otra pestaña/incógnito) → `POST /auth/qr-token?aula_id=<uuid>`
5. Pega ese token en `QR estudiante>` → `✔ ACCESO PERMITIDO — LED VERDE`
6. Verifica el registro en la BD:
   ```bash
   docker exec sc_postgres psql -U scadmin -d smartcampus \
     -c "SELECT user_id, timestamp_in, metodo FROM asistencia ORDER BY timestamp_in DESC LIMIT 3;"
   ```

### 10c) Parar y limpiar

```bash
docker compose --profile simulate down            # detiene contenedores, mantiene volúmenes
docker compose --profile simulate down -v         # también borra postgres_data, redis_data, etc.
```

### 10d) Tips útiles

- **Si cambias init.sql**, debes recrear el volumen para que se vuelva a ejecutar:
  ```bash
  docker compose --profile simulate down -v && docker compose --profile simulate up -d --build
  ```
- **Logs en vivo del backend**: `docker compose logs -f backend`
- **Shell dentro del backend**: `docker compose exec backend sh`
- **Ver claves generadas**: `ls -la infra/certs/` (las generó el entrypoint del backend container)

---

Si quieres, convierto estos comandos en scripts ejecutables (`scripts/*.sh`) o un `Makefile` para poder lanzarlos con `make dev`.
