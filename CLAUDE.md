# Smart Campus — Contexto del proyecto para Claude Code

> Este archivo le da contexto completo a Claude Code sobre el proyecto. Ponlo en la raíz del workspace (`~/Projects/smart-campus/CLAUDE.md`).

---

## 👤 Desarrollador

- **Nombre:** Kevin Cueto
- **Universidad:** Universidad del Norte, Barranquilla, Colombia
- **Proyecto:** Trabajo final de grado — Ingeniería de Sistemas
- **SO:** Windows con WSL2 (Ubuntu) — trabaja en terminal Ubuntu
- **Ruta del proyecto:** `~/Projects/smart-campus/`
- **Idioma:** Responder en español, código en inglés (variables/funciones), UI en español

---

## 📌 Sobre el proyecto

Sistema **Smart ID + Smart Campus** para control de acceso inteligente a aulas universitarias. Combina:
- Autenticación con QR dinámico JWT RS256
- Control físico de acceso (LED en Pi 5 simula cantonera)
- Toma de asistencia automática
- Reserva de salones libres por estudiantes
- Dashboard web PWA accesible desde celular

---

## 🚪 Lógica de negocio CORE

### Caso 1 — Clase oficial (profesor)
1. Profesor abre la app PWA y selecciona su clase del día
2. Define minutos de sesión de asistencia (5-15 minutos)
3. Genera su QR — debe mostrarlo a la webcam de la Pi 5
4. Pi 5 valida JWT → LED verde → aula abierta
5. Temporizador corre — el profesor no puede cambiar minutos mientras esté activo
6. Estudiantes de esa clase llegan y escanean QR uno a uno
7. Cada escaneo registra asistencia en tiempo real
8. Validación: no se puede generar QR para clases que ya terminaron
9. Temporizador termina → LED apaga → sesión cerrada
10. El profesor puede cerrar manualmente antes

### Caso 2 — Reserva libre (estudiante)
1. Estudiante selecciona fecha, hora (entre 07:00 y 18:00) y duración (1, 2 o 3 horas)
2. Sistema muestra solo aulas SIN clase ni reserva activa en ese horario
3. Crea la reserva → queda en estado `activa`
4. Puede cancelarla antes de que empiece
5. Cuando llega, escanea su QR → LED verde → entra
6. Cualquier otro estudiante puede entrar escaneando su QR
7. Sin toma de asistencia — solo registro de acceso
8. Tiempo termina → LED apaga → reserva pasa a `finalizada`

### Caso 3 — Acceso denegado (LED rojo)
- Token JWT inválido o expirado
- Estudiante sin reserva ni clase asignada
- Nonce ya usado (anti-replay)
- Genera evento de alerta

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite, TailwindCSS, @tabler/icons-react, react-qr-code, axios |
| Backend | Python 3.12, FastAPI, Uvicorn |
| Auth | PyJWT RS256, passlib bcrypt==4.0.1, RBAC, Redis blacklist |
| ORM | SQLAlchemy async + asyncpg |
| Bases de datos | PostgreSQL 16, Redis 7 |
| Edge | Python 3.13 + OpenCV + pyzbar + paho-mqtt + gpiozero + lgpio |
| Hardware | Raspberry Pi 5 (8GB/128GB CanaKit), Webcam USB, LEDs (GPIO 17=verde, 27=rojo) |
| Infra | Docker Compose (postgres + redis + mosquitto) |

---

## 📁 Estructura actual

```
smart-campus/
├── docker-compose.yml          ✅ postgres + redis funcionando
├── .gitignore                  ✅
├── README.md                   ✅
│
├── backend/                    ✅ FUNCIONANDO
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py             ✅ FastAPI + CORS + 4 routers
│   │   ├── database.py         ✅ async engine + get_db()
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── horarios.py     ✅ GET /horarios/mis-clases
│   │   │   ├── asistencia.py   ✅ GET /asistencia/mis-estadisticas
│   │   │   ├── profesor.py     ✅ Endpoints del profesor
│   │   │   └── reservas.py     ✅ CRUD de reservas
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── jwt_handler.py  ✅ JWT RS256 + nonce + blacklist
│   │   │   ├── dependencies.py ✅ get_current_user, require_role
│   │   │   ├── router.py       ✅ /auth/login, /register, /logout
│   │   │   └── schemas.py      ✅ Pydantic models
│   │   └── models/
│   │       ├── __init__.py
│   │       └── user.py         ✅ SQLAlchemy User model
│   ├── requirements.txt        ✅
│   └── venv/                   ✅ activo (gitignored)
│
├── frontend/                   ✅ FUNCIONANDO
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── index.css           (TailwindCSS)
│   │   ├── components/
│   │   │   ├── LoginCard.jsx       ✅ login conectado API
│   │   │   ├── AuthLayout.jsx
│   │   │   └── Clock.jsx           ✅ reloj en tiempo real
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── LoginPage.jsx
│   │   │   ├── StudentDashboard.jsx ✅ completo con reservas
│   │   │   ├── TeacherDashboard.jsx ✅ QR + asistencia tiempo real
│   │   │   └── QRPage.jsx           ✅ QR pantalla completa
│   │   ├── router/
│   │   │   └── AppRouter.jsx
│   │   └── services/
│   │       └── api.js              ✅ axios + interceptors JWT
│   └── public/
│
├── database/
│   └── postgres/
│       └── init.sql            ✅
│
├── edge/                       ✅ FUNCIONANDO — corre nativo en Pi 5
│   ├── main.py                 ✅ OpenCV + pyzbar + GPIO + MQTT + short token
│   ├── requirements.txt        ✅
│   └── venv/                   ✅ en la Pi (gitignored)
├── mqtt-broker/                ✅ Mosquitto en Docker
│   └── mosquitto.conf          ✅
├── monitoring/                 ⬜ PENDIENTE
│
└── infra/
    ├── certs/
    │   ├── private.pem         ✅ generada RS256
    │   └── public.pem          ✅ generada RS256
    └── nginx/                  ⬜ pendiente
```

---

## 🔐 Endpoints del backend

### Auth
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | Login con código + password |
| POST | `/auth/register` | admin | Crear usuario |
| POST | `/auth/logout` | auth | Revocar token en Redis |
| POST | `/auth/qr-token?aula_id=X` | auth | Genera short code 12 chars → JWT en Redis (30s) |
| GET | `/auth/me` | auth | Info del usuario actual |

### Acceso Edge
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| POST | `/acceso/validar-qr` | público | Resuelve short code → JWT → valida acceso + registra asistencia |

### Horarios
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/horarios/mis-clases` | auth | Horario del estudiante |

### Asistencia
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/asistencia/mis-estadisticas` | auth | % asistencia + últimas 5 |

### Profesor
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/profesor/mis-clases-hoy` | docente | Clases del día |
| GET | `/profesor/todas-mis-clases` | docente | Todas las clases |
| POST | `/profesor/generar-qr` | docente | Inicia sesión + valida hora |
| GET | `/profesor/asistencia-sesion/{horario_id}` | docente | Asistentes en tiempo real |

### Reservas
| Método | Endpoint | Rol | Descripción |
|---|---|---|---|
| GET | `/reservas/aulas-disponibles?fecha=X&hora_inicio=Y&duracion_horas=Z` | auth | Aulas libres |
| POST | `/reservas/crear` | auth | Crear reserva |
| GET | `/reservas/mis-reservas` | auth | Mis reservas activas |
| DELETE | `/reservas/cancelar/{reserva_id}` | auth | Cancelar reserva |

---

## 🗄️ Base de datos PostgreSQL

### Tablas
- `users` — id, codigo, nombre, email, password (bcrypt), rol (enum), activo
- `aulas` — id, codigo, nombre, edificio, capacidad
- `horarios` — id, aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin
- `inscripciones` — user_id, horario_id (UNIQUE)
- `reservas` — id, user_id, aula_id, inicio, fin, estado
- `asistencia` — id, user_id, aula_id, horario_id, timestamp_in, metodo, valido
- `accesos` — id, user_id, aula_id, timestamp, evento, token_nonce, ip_edge, detalle (JSONB)
- `tokens_revocados` — jti, user_id, revocado_at, expira_at

### Datos seed actuales
**Usuarios (password de todos = `1234`):**
- `2024001` Ana García (estudiante)
- `2024002` Luis Martínez (estudiante)
- `2024003` Carlos López (estudiante)
- `DOC001` Prof. Rodríguez (docente)
- `ADM001` Admin Campus (administrador)

**Aulas:** AULA-101, AULA-202, LAB-301

**Horarios del Prof. Rodríguez:**
- Lunes 08:00-10:00 — Arquitectura de Software — AULA-101
- Martes 08:00-10:00 — Redes y Comunicaciones — AULA-101
- Martes 10:00-12:00 — Sistemas Ciberfísicos — LAB-301
- Martes 12:00-14:00 — Bases de Datos Avanzadas — AULA-202
- Miércoles 14:00-16:00 — Gestión Integrada en TI — AULA-202
- Viernes 07:00-09:00 — Criptografía — AULA-101

**Asistencia:** 10 registros por estudiante (datos dummy de las últimas 3 semanas)

---

## 🗝️ Credenciales

### PostgreSQL
- Host: `localhost:5432`
- DB: `smartcampus`
- User: `scadmin`
- Pass: `scpassword123`

### Redis
- URL: `redis://:redispassword123@localhost:6379/0`

### JWT RS256
- Private: `infra/certs/private.pem`
- Public: `infra/certs/public.pem`
- Access TTL: 30 minutos
- QR TTL: 30 segundos + nonce anti-replay

---

## 🖥️ Cómo levantar el proyecto

```bash
# 1. Servicios Docker
cd ~/Projects/smart-campus
docker compose up postgres redis mosquitto -d

# 2. Backend (desarrollo local, solo accesible desde WSL2)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 2b. Backend accesible desde la Pi (necesario para pruebas con hardware)
uvicorn app.main:app --reload --port 8000 --host 0.0.0.0

# 3. Frontend (nueva terminal)
cd frontend
npm run dev
```

### URLs
- Frontend: http://localhost:5173
- Backend Swagger: http://localhost:8000/docs

### Red — acceso de la Pi al backend (WSL2)
- IP de la Pi: `192.168.1.10`
- IP de Windows en LAN: `192.168.1.15`
- IP de WSL2: `172.17.103.168` (puede cambiar al reiniciar)
- Portproxy activo en Windows: `192.168.1.15:8000 → 172.17.103.168:8000`
- Para actualizar el portproxy si cambia la IP de WSL2: ver SCRIPTS.md sección 5b

---

## ⚠️ Notas técnicas importantes

1. **bcrypt fijado en 4.0.1** — versiones más nuevas son incompatibles con passlib
2. **asyncpg NO soporta `::date` o `::time` con parámetros nombrados** — usar `.isoweekday()` y `.time()` de Python
3. **Trabajamos en WSL2 Ubuntu**, NO PowerShell
4. **El edge node NO usa Docker** — corre directo en Pi 5 con Python 3.13
5. **gpiozero + lgpio** para GPIO en Pi 5 (RPi.GPIO está deprecado). Instalar: `sudo apt install swig liblgpio-dev`
6. **TailwindCSS** con tema naranja (`orange-300` como primario, `orange-400` hover)
7. **Roles en español**: `estudiante`, `docente`, `administrador`
8. **Frontend conecta `email` legacy → `codigo` real** (código universitario)
9. **Validación de hora de clase**: el profesor no puede generar QR si la clase ya terminó
10. **CORS configurado** para `localhost:5173`, `127.0.0.1:5173`, `localhost:3000`, `127.0.0.1:3000`
11. **QR usa short token**: el QR muestra un código de 12 chars (ej: `A3F8C2D91B4E`), no el JWT completo. El backend lo resuelve desde Redis.
12. **Edge node cooldown = 30s**: después de leer un QR la cámara espera 30s antes de procesarlo de nuevo (evita re-lecturas con nonce ya usado)
13. **Pi sin display**: no usar `cv2.imshow()` salvo que `$DISPLAY` esté definido. El edge node ya lo maneja.
14. **Backend necesita `--host 0.0.0.0`** para ser accesible desde la Pi (WSL2 por defecto solo escucha en 127.0.0.1)

---

## 🎨 Tema visual del frontend

- Color primario: `text-orange-300`, `bg-orange-300`, hover `orange-400`
- Fondos: `bg-slate-50`, cards `bg-white`
- Bordes: `border-slate-200`
- Texto principal: `text-slate-900`
- Texto secundario: `text-slate-500`
- Éxito: `text-green-600`, `bg-green-50`
- Error: `text-rose-500`, `bg-rose-50`
- Iconos: librería `@tabler/icons-react`
- Tipografía: por defecto del navegador

---

## ✅ Completado (Bloque 1)

1. **Edge node Pi 5** — OpenCV + pyzbar + GPIO + MQTT + short token ✅ PROBADO CON CÁMARA REAL
2. **Endpoint `/acceso/validar-qr`** — resuelve short code → JWT → valida + registra ✅
3. **Mosquitto MQTT broker** — en docker-compose ✅
4. **Short token QR** — 12 chars en Redis en lugar de JWT completo en el QR ✅
5. **Dashboard admin** — CRUD usuarios, aulas, horarios, accesos ✅

## ⬜ Pendiente por construir (en orden)

### Bloque 2 — Tiempo real y UX
1. **WebSockets** en lugar de polling cada 5s (asistencia tiempo real en dashboard profesor)
2. **Notificación visual/sonora** al pasar asistencia en el dashboard
3. **PWA real** (manifest.json + service worker)
4. **LEDs físicos** conectar cables macho-hembra a la protoboard (pendiente conseguir en lab)

### Bloque 3 — Seguridad avanzada
5. **AES-GCM** cifrado adicional en el QR token
6. **Detección de anomalías** (múltiples intentos fallidos)

### Bloque 4 — Producción
7. **InfluxDB + Grafana** para métricas
8. **Dockerfiles** backend + frontend
9. **Nginx** proxy reverso + HTTPS
10. **Despliegue AWS** EC2/ECS

---

## 🚫 Cosas que NO funcionan / a evitar

- No usar `localStorage` en componentes React Native (no aplica aquí pero por si acaso)
- No usar `RPi.GPIO` en Pi 5 — usar `gpiozero` con backend `lgpio`
- No usar parámetros con `::cast` en SQL async con asyncpg
- No usar `bcrypt` versión > 4.0.1
- No olvidar activar venv antes de ejecutar uvicorn
- No usar timezone-naive datetimes al comparar con `r.inicio` (siempre `datetime.now(timezone.utc)`)

---

## 📦 Dependencias críticas

### Backend (requirements.txt)
```
fastapi
uvicorn[standard]
PyJWT
cryptography
sqlalchemy
asyncpg
redis
python-dotenv
passlib
bcrypt==4.0.1
python-multipart
paho-mqtt
pandas
influxdb-client
alembic
```

### Frontend (package.json)
```
react, react-dom, react-router-dom
vite
tailwindcss
axios
react-qr-code
@tabler/icons-react
```

---

## 🎯 Cómo me gusta trabajar

- Comandos listos para pegar en terminal (no instrucciones manuales largas)
- Cuando hago cambios en archivos, usa `cat > archivo << 'EOF'` o scripts Python
- Si hay error, primero revisar logs del backend (terminal uvicorn)
- Verificar siempre con `grep -n` que los cambios se aplicaron
- Si un `sed` falla, mejor reescribir el archivo completo con `cat > archivo`
- Prefiero ver visualizaciones del progreso/arquitectura cuando aporten claridad
