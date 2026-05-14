# Plan de desarrollo — Smart Campus

> Basado en el informe final, diagramas de arquitectura y estado actual del código.
> Fecha: Mayo 2026 | Autor: Kevin Cueto — Universidad del Norte

---

## Estado actual ✅

| Módulo | Estado |
|---|---|
| Auth JWT RS256 + RBAC + Redis blacklist | ✅ Funcional |
| Backend FastAPI (horarios, asistencia, reservas, profesor) | ✅ Funcional |
| Frontend PWA base (StudentDashboard, TeacherDashboard, QRPage) | ✅ Funcional |
| PostgreSQL + Redis en Docker Compose | ✅ Funcional |
| Seed de datos (usuarios, aulas, horarios, inscripciones, asistencia mock) | ✅ Funcional |

---

## Lo que falta — ordenado por prioridad

---

### 🔴 BLOQUE 1 — Crítico para el prototipo funcional (tesis)

#### 1. Endpoint `/acceso/validar-qr` (backend)
El endpoint que la Pi llama al escanear un QR. Es el corazón del sistema.

- Recibe el JWT del QR
- Valida firma RS256, expiración y nonce (anti-replay en Redis)
- Verifica que el `aula_id` del token coincida con el aula del nodo
- Verifica que el usuario tenga clase o reserva activa en ese momento
- Registra evento en tabla `accesos`
- Registra asistencia en tabla `asistencia`
- Publica resultado en MQTT → el nodo edge activa LED verde/rojo
- Retorna `{"acceso": "permitido" | "denegado", "motivo": "..."}`

#### 2. MQTT Broker — Mosquitto en docker-compose
Agregar servicio `mosquitto` al `docker-compose.yml` para que el backend y el edge se comuniquen.

- Imagen: `eclipse-mosquitto:2`
- Puerto: 1883 (MQTT) y 9001 (WebSocket opcional)
- Config: `mosquitto.conf` con `allow_anonymous true` para dev

#### 3. MQTT subscriber en el backend
El backend necesita suscribirse a los tópicos MQTT de los nodos edge.

- Tópico `campus/aula/{aula_id}/evento` — el nodo publica el resultado del escaneo
- El backend guarda el evento en `accesos` y publica respuesta al nodo
- Usar `paho-mqtt` con `asyncio` (ya está en requirements.txt)

#### 4. Edge node — script para la Pi 5
Archivo `edge/main.py` — corre nativo en Pi 5 (sin Docker).

- OpenCV + pyzbar: captura frame de webcam → decodifica QR
- PyJWT: valida firma RS256 localmente con `infra/certs/public.pem`
- Si válido localmente → publica en MQTT `campus/aula/{id}/scan`
- Espera respuesta del backend vía MQTT
- gpiozero + lgpio: LED verde (permitido) o LED rojo (denegado) por 3s
- Anti-replay local: caché de nonces usados (últimos 60s)

---

### 🟡 BLOQUE 2 — Importante para la demo y usabilidad

#### 5. WebSockets en asistencia del profesor
Reemplazar el polling cada 5s del `TeacherDashboard` por WebSocket real.

- Endpoint `GET /ws/asistencia-sesion/{horario_id}`
- El backend emite evento cada vez que llega un nuevo registro
- El frontend recibe y actualiza la lista sin recargar

#### 6. Dashboard del administrador
Página `AdminDashboard.jsx` con:

- CRUD de usuarios (crear, activar/desactivar, cambiar rol)
- CRUD de aulas
- CRUD de horarios e inscripciones
- Vista de accesos recientes (tabla `accesos`)
- Estadísticas globales de asistencia

Backend: endpoints en `/admin/` protegidos con `require_role(administrador)`.

#### 7. PWA — manifest + service worker
Para que la app sea instalable en el celular del estudiante/docente.

- `public/manifest.json` — nombre, iconos, tema naranja
- `public/sw.js` — service worker básico (cache shell)
- Meta tag `<link rel="manifest">` en `index.html`

---

### 🟠 BLOQUE 3 — Seguridad adicional (mencionada en el informe)

#### 8. AES-GCM sobre el payload del QR token
El informe menciona cifrado AES-256-GCM sobre el JWT antes de codificarlo en el QR.

- En `jwt_handler.py`: cifrar el JWT generado con AES-GCM + clave simétrica
- En el edge node: descifrar antes de validar la firma JWT
- La clave AES se distribuye al edge junto con la clave pública RS256

#### 9. Detección básica de anomalías
Motor simple de reglas heurísticas sobre la tabla `accesos`.

- Nonce ya usado → alerta "intento de replay"
- Mismo user_id en dos aulas distintas en < 5 minutos → alerta "ubicación imposible"
- Más de 30 escaneos en 1 minuto desde un nodo → alerta "posible ataque automatizado"
- Endpoint `GET /admin/alertas` que lista los eventos anómalos recientes

---

### ⚪ BLOQUE 4 — Producción / nice to have

#### 10. InfluxDB en docker-compose
Para métricas de series temporales (latencia de validación, frecuencia de accesos por aula).

- Imagen: `influxdb:2.7`
- El backend escribe métricas al validar QR
- Sustituye/complementa a PostgreSQL para datos de eventos

#### 11. Grafana en docker-compose
Dashboard visual conectado a InfluxDB + PostgreSQL.

- Imagen: `grafana/grafana:10.x`
- Dashboard: accesos por aula en tiempo real, % asistencia global, alertas

#### 12. Nginx + HTTPS
Proxy reverso para producción.

- Imagen: `nginx:alpine`
- Redirige `/api` → backend:8000, `/` → frontend:80
- Certificado TLS con Let's Encrypt (producción) o self-signed (dev)

#### 13. Dockerfiles backend + frontend
Para poder hacer `docker compose up` completo.

- `backend/Dockerfile`
- `frontend/Dockerfile` (build Vite + serve con nginx)

#### 14. Despliegue AWS EC2/ECS
- Subir imágenes a ECR
- EC2 t3.small con Docker Compose o ECS Fargate

---

## Orden de ejecución sugerido

```
Bloque 1 (prototipo demo):
  1. Mosquitto en docker-compose          ← 30 min
  2. Endpoint /acceso/validar-qr          ← 2 horas
  3. MQTT subscriber en backend           ← 1 hora
  4. Edge node script (Pi 5)              ← 3 horas

Bloque 2 (demo completa):
  5. WebSockets asistencia                ← 2 horas
  6. Admin dashboard                      ← 4 horas
  7. PWA manifest                         ← 1 hora

Bloque 3 (seguridad):
  8. AES-GCM en QR token                  ← 2 horas
  9. Detección anomalías básica           ← 2 horas

Bloque 4 (producción):
  10-14. InfluxDB, Grafana, Nginx, Docker, AWS  ← días
```

---

## Lo que el informe describe y ya está implementado

| Lo del informe | Implementado |
|---|---|
| JWT RS256 con nonce anti-replay | ✅ |
| RBAC (estudiante, docente, administrador) | ✅ |
| QR dinámico TTL 30s | ✅ |
| Reservas de aulas con horario | ✅ |
| Registro de asistencia | ✅ |
| Blacklist tokens en Redis | ✅ |
| PWA React frontend | ✅ (sin manifest) |
| PostgreSQL 16 + Redis 7 | ✅ |

## Lo que el informe describe y falta

| Lo del informe | Estado |
|---|---|
| Cifrado AES-256-GCM sobre JWT | ⬜ Bloque 3 |
| Nodo edge (OpenCV + pyzbar + GPIO) | ⬜ Bloque 1 |
| MQTT Broker (Mosquitto) | ⬜ Bloque 1 |
| Endpoint `/acceso/validar-qr` | ⬜ Bloque 1 |
| Motor de detección de anomalías | ⬜ Bloque 3 |
| InfluxDB series temporales | ⬜ Bloque 4 |
| Grafana dashboards | ⬜ Bloque 4 |
| Dashboard administrador | ⬜ Bloque 2 |
| WebSockets (reemplazar polling) | ⬜ Bloque 2 |
| PWA manifest + service worker | ⬜ Bloque 2 |
| Nginx + HTTPS | ⬜ Bloque 4 |
| AWS despliegue | ⬜ Bloque 4 |
