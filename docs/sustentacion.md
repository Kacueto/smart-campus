# Smart Campus — Sustentación Técnica
**Universidad del Norte · Trabajo de Grado · Ingeniería de Sistemas**

---

## 1. Problema que resuelve

Las universidades controlan el acceso a aulas con llaves físicas o tarjetas de proximidad estáticas. Esto genera:
- Sin registro automático de asistencia
- Sin control de reservas de espacios libres
- Sin trazabilidad de quién entró y cuándo
- Riesgo de acceso no autorizado sin detección

**Smart Campus** reemplaza ese sistema con control de acceso inteligente basado en QR dinámico, con registro automático de asistencia y trazabilidad completa.

---

## 2. Arquitectura general

```
  [PWA React]  ←→  [FastAPI Backend]  ←→  [PostgreSQL]
       ↑                  ↑                   [Redis]
       |              [MQTT TLS]            [InfluxDB]
       |                  ↓
  [Celular /        [Raspberry Pi 5]
   Navegador]       Webcam + LEDs GPIO
```

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS (PWA) |
| Backend | Python 3.12 + FastAPI + Uvicorn |
| Autenticación | JWT RS256 + AES-256-GCM + Redis blacklist |
| Base de datos | PostgreSQL 16 + SQLAlchemy async |
| Caché / Sesiones | Redis 7 |
| Mensajería | MQTT con TLS (Mosquitto) |
| Edge node | Python 3.13 + OpenCV + pyzbar + gpiozero |
| Hardware | Raspberry Pi 5 + Webcam USB + LEDs (GPIO 17/27) |
| Monitoreo | InfluxDB 2.7 + Grafana 10 |
| Infraestructura | Docker Compose + Nginx |

---

## 3. Flujos principales

### Caso 1 — Clase oficial (profesor)
1. Profesor inicia sesión en la PWA
2. Selecciona su clase del día y define minutos de sesión (5–15 min)
3. Genera su QR — sistema valida que la clase esté en rango horario activo
4. Profesor muestra el QR a la webcam de la Pi 5
5. Pi valida → **LED verde** → aula abierta
6. Estudiantes inscritos escanean uno a uno → asistencia registrada en tiempo real
7. Dashboard del profesor muestra asistentes vía **WebSocket** (sin polling)
8. Al terminar el tiempo → LED apaga → sesión cerrada automáticamente

### Caso 2 — Reserva libre (estudiante)
1. Estudiante selecciona fecha, hora (07:00–18:00) y duración (1, 2 o 3 horas)
2. Sistema muestra solo aulas **sin clase ni reserva activa** en ese horario
3. Crea la reserva → puede cancelarla antes del inicio
4. Llega al aula, escanea su QR → LED verde → acceso permitido
5. Reserva pasa a `finalizada` automáticamente al terminar

### Caso 3 — Acceso denegado
- Token inválido, expirado o nonce ya usado → **LED rojo** + evento de alerta

---

## 4. Seguridad — capas implementadas

```
QR en pantalla
     ↓
[AES-256-GCM] ← cifra el short code antes de mostrarlo en el QR
     ↓
Short code (12 chars) almacenado en Redis con TTL 30s
     ↓
[JWT RS256] ← firma con clave privada del servidor
     ↓
Nonce UUID anti-replay ← marcado como "usado" en Redis al validar
     ↓
Blacklist Redis ← logout invalida el token antes de su expiración
```

**¿Por qué doble cifrado (AES + RS256)?**
- El QR solo muestra un código corto cifrado, nunca el JWT completo
- Aunque alguien fotografíe el QR, expira en 30 segundos
- El nonce impide que un QR válido se use dos veces (anti-replay)

---

## 5. Redis — estructura de claves y TTLs

Redis actúa como capa de estado efímero. El sistema usa **4 tipos de claves** con propósitos distintos:

```
┌─────────────────────────────────────────────────────────────────┐
│                        REDIS                                    │
│                                                                 │
│  qr:<SHORT_CODE>          TTL: 35s                              │
│  └─ valor: JWT completo RS256                                   │
│     Creado al generar QR. La Pi lo resuelve con el short code.  │
│                                                                 │
│  nonce:<UUID>             TTL: 60s                              │
│  └─ valor: "used"                                               │
│     Marcado al validar un QR. Impide replay attacks.            │
│     Si existe → acceso denegado aunque el JWT sea válido.       │
│                                                                 │
│  blacklist:<JTI>          TTL: 30min (= vida del access token)  │
│  └─ valor: "revoked"                                            │
│     Creado al hacer logout. Invalida el token aunque no haya    │
│     expirado. JTI = JWT ID único por token.                     │
│                                                                 │
│  (no hay claves de sesión de usuario — stateless con JWT)       │
└─────────────────────────────────────────────────────────────────┘
```

### Flujo completo del QR con Redis

```
BACKEND genera QR:
  1. Crea JWT RS256 con payload {sub, rol, aula_id, nonce, exp:+30s}
  2. Genera short_code = uuid4().hex[:12].upper()  → "A3F8C2D91B4E"
  3. SET qr:A3F8C2D91B4E → <JWT>  EXPIRE 35
  4. Cifra short_code con AES-256-GCM → token opaco para el QR

PI escanea QR:
  1. Descifra AES-GCM → "A3F8C2D91B4E"
  2. GET qr:A3F8C2D91B4E → obtiene el JWT completo
  3. Verifica firma RS256 del JWT
  4. Verifica nonce: EXISTS nonce:<UUID> → si existe, replay → denegado
  5. SET nonce:<UUID> → "used"  EXPIRE 60
  6. Registra asistencia en PostgreSQL

LOGOUT:
  1. Extrae JTI del access token
  2. SET blacklist:<JTI> → "revoked"  EXPIRE 1800
  3. Cada request verifica: EXISTS blacklist:<JTI>
```

### ¿Por qué Redis y no PostgreSQL para esto?

| Requisito | Redis | PostgreSQL |
|---|---|---|
| Leer/escribir en < 1ms | ✅ en memoria | ❌ I/O de disco |
| TTL automático | ✅ nativo | ❌ requiere cron job |
| Nonces con expiración | ✅ SETEX atómico | ❌ complejo |
| Volumen alto (1 nonce/escaneo) | ✅ sin overhead | ❌ escribe WAL |

---

## 6. Edge node — Raspberry Pi 5

```python
# Flujo de validación en la Pi
QR detectado por pyzbar
    → _decrypt_qr()        # AES-256-GCM descifra → short code
    → _validar_jwt_local() # verifica firma RS256 + nonce local
    → _llamar_backend()    # POST /acceso/validar-qr → registro en BD
    → _activar_led()       # GPIO: verde (permitido) / rojo (denegado)
    → _publicar_evento()   # MQTT: publica resultado en topic del aula
```

- **Cooldown 30s**: evita re-lecturas del mismo QR
- **Modo degradado**: si el backend no responde → LED rojo (fail-safe)
- **Sin display**: corre headless en la Pi, sin interfaz gráfica

---

## 6. MQTT — mensajería entre backend y Pi

MQTT (Message Queuing Telemetry Transport) es un protocolo pub/sub ligero diseñado para dispositivos IoT con ancho de banda limitado.

### Topología de topics

```
campus/aula/{aula_uuid}/control   ← backend → Pi
campus/aula/{aula_uuid}/scan      ← Pi → backend
```

### Flujo de control de sesión

```
PROFESOR genera QR en dashboard:
  Backend publica en campus/aula/{uuid}/control:
  { "accion": "abrir_sesion", "hora_fin_clase": "12:00" }

Pi recibe:
  → _estado_sesion["hora_fin_clase"] = "12:00"
  → Puerta queda "abierta" — acepta QR de estudiantes

PROFESOR cierra sesión manualmente:
  Backend publica: { "accion": "cerrar_sesion" }
  Pi recibe → _estado_sesion["cerrar"] = True → puerta cierra
```

### TLS en MQTT

- Broker Mosquitto con certificado propio (CA autofirmada + SAN)
- Pi usa `ca.crt` para verificar el servidor — nunca acepta certs no firmados
- Puerto **8883** (TLS) en producción vs 1883 (plano) en desarrollo local
- `tls_insecure_set(False)` — verificación estricta del hostname

---

## 7. Tiempo real — WebSocket

El dashboard del profesor recibe asistencias **instantáneamente** sin polling:

```
Pi escanea QR del estudiante
    → POST /acceso/validar-qr
    → INSERT INTO asistencia
    → manager.broadcast(horario_id, {"type": "new", "asistente": {...}})
    → Frontend recibe el mensaje WS
    → Aparece el nombre del estudiante + sonido de notificación
```

---

## 7. Monitoreo — InfluxDB + Grafana

Cada acceso escribe una métrica en InfluxDB:

```
acceso,resultado=permitido,aula=AULA-101,rol=estudiante value=1
asistencia,materia=IA,aula=AULA-101 value=1
alerta,tipo=replay,aula=AULA-101 value=1
```

Dashboard Grafana disponible en `:3000` con:
- Accesos por hora (últimas 24h)
- Distribución por aula (pie chart)
- Asistencias por día (últimos 30 días)
- Tabla de últimos 50 accesos en tiempo real

---

## 8. Base de datos — modelo de datos clave

```sql
users        → id, codigo, nombre, rol (estudiante/docente/administrador)
aulas        → id, codigo, nombre, edificio, capacidad
horarios     → aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin
inscripciones → user_id, horario_id
reservas     → user_id, aula_id, inicio, fin, estado
asistencia   → user_id, aula_id, horario_id, timestamp_in, metodo
accesos      → user_id, aula_id, evento, token_nonce, ip_edge, detalle (JSONB)
```

---

## 9. Datos del sistema actual

| Entidad | Cantidad |
|---|---|
| Estudiantes | 115 |
| Docentes | 12 |
| Aulas | 17 |
| Horarios activos | 45 |
| Inscripciones | 737 |
| Registros de asistencia | 7,945 |

---

## 10. Decisiones técnicas destacadas

| Decisión | Alternativa descartada | Razón |
|---|---|---|
| JWT RS256 (asimétrico) | HS256 (simétrico) | Pi solo necesita la clave pública, nunca puede forjar tokens |
| Short code + Redis | JWT completo en el QR | QR más pequeño, rotación en 30s, menos exposición |
| AES-256-GCM sobre el short code | Short code en claro | Un QR fotografiado no revela el código subyacente |
| WebSocket en vez de polling | setInterval cada 5s | Latencia cero, sin carga innecesaria al servidor |
| `asyncpg` + `text()` directo | ORM con modelos | Flexibilidad en queries complejas, sin overhead |
| gpiozero + lgpio | RPi.GPIO | RPi.GPIO deprecado en Pi 5, lgpio es el backend oficial |
