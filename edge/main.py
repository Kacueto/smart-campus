"""
Smart Campus — Edge Node
Corre en Raspberry Pi 5 (Python 3.11, sin Docker)

Dependencias:
    pip install opencv-python pyzbar paho-mqtt PyJWT cryptography requests

Uso:
    python3 main.py --aula AULA-101 --backend http://<server-ip>:8000
"""

import argparse
import os
import select
import sys
import time
import logging
import json
import requests
import jwt
import paho.mqtt.client as mqtt
from pathlib import Path
from datetime import datetime, timezone

# ── Configuración por defecto ─────────────────────────────────────────────────
BACKEND_URL   = "http://localhost:8000"
MQTT_HOST     = "localhost"
MQTT_PORT     = 1883
PUBLIC_KEY_PATH = Path(__file__).parent / "../infra/certs/public.pem"
CAMERA_INDEX  = 0        # índice de la webcam USB
LED_VERDE_PIN = 17       # GPIO BCM
LED_ROJO_PIN  = 27       # GPIO BCM
LED_DURACION  = 3        # segundos que permanece encendido el LED

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [EDGE] %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# ── Carga clave pública RS256 ────────────────────────────────────────────────
PUBLIC_KEY = PUBLIC_KEY_PATH.read_text()

# ── Estado de sesión compartido con callbacks MQTT ────────────────────────────
_estado_sesion: dict = {"cerrar": False, "hora_fin_clase": None}

# ── Anti-replay local (caché de nonces procesados en los últimos 60s) ─────────
_nonce_cache: dict[str, float] = {}


def _nonce_ya_usado(nonce: str) -> bool:
    """Verifica si el nonce ya fue procesado (anti-replay local en caché de 60s)."""
    ahora = time.time()
    # Limpiar nonces viejos
    for k in list(_nonce_cache):
        if ahora - _nonce_cache[k] > 60:
            del _nonce_cache[k]
    if nonce in _nonce_cache:
        return True
    _nonce_cache[nonce] = ahora
    return False


# ── GPIO (LED) ────────────────────────────────────────────────────────────────
_gpio_disponible = False
try:
    from gpiozero import LED
    from gpiozero.pins.lgpio import LGPIOFactory
    from gpiozero import Device
    Device.pin_factory = LGPIOFactory()
    led_verde = LED(LED_VERDE_PIN)
    led_rojo  = LED(LED_ROJO_PIN)
    _gpio_disponible = True
    logger.info("GPIO inicializado (gpiozero + lgpio)")
except Exception as e:
    logger.warning(f"GPIO no disponible (modo simulación): {e}")
    led_verde = None
    led_rojo  = None


def _activar_led(permitido: bool):
    """Enciende LED verde (acceso permitido) o rojo (denegado) durante LED_DURACION segundos."""
    if _gpio_disponible:
        led = led_verde if permitido else led_rojo
        logger.info(f"LED {'VERDE' if permitido else 'ROJO'} encendido por {LED_DURACION}s")
        led.on()
        time.sleep(LED_DURACION)
        led.off()
    else:
        if permitido:
            print("\n\033[42m\033[97m  ✔  ACCESO PERMITIDO  — LED VERDE  \033[0m")
        else:
            print("\n\033[41m\033[97m  ✘  ACCESO DENEGADO   — LED ROJO   \033[0m")
        time.sleep(LED_DURACION)
        print()


# ── MQTT ──────────────────────────────────────────────────────────────────────
_mqtt_client: mqtt.Client = None


def _init_mqtt(aula_id: str, aula_uuid: str):
    """Inicializa el cliente MQTT y se conecta al broker; falla silenciosamente si no está disponible."""
    global _mqtt_client
    _mqtt_client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION1,
        client_id=f"edge-{aula_id}",
        protocol=mqtt.MQTTv311,
    )

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logger.info("MQTT: conectado al broker")
            # El backend publica con UUID, no con el código corto
            topic_control = f"campus/aula/{aula_uuid}/control"
            client.subscribe(topic_control, qos=1)
            logger.info(f"MQTT: suscrito a {topic_control}")
        else:
            logger.error(f"MQTT: error rc={rc}")

    def on_message(client, userdata, msg):
        try:
            data = json.loads(msg.payload.decode())
            accion = data.get("accion")
            if accion == "cerrar_sesion":
                _estado_sesion["cerrar"] = True
                logger.info("MQTT: señal de cierre manual recibida")
            elif accion == "abrir_sesion":
                _estado_sesion["hora_fin_clase"] = data.get("hora_fin_clase")
                logger.info(f"MQTT: sesión abierta — puerta hasta {data.get('hora_fin_clase', '?')}")
        except Exception as e:
            logger.error(f"MQTT: error procesando control: {e}")

    _mqtt_client.on_connect = on_connect
    _mqtt_client.on_message = on_message
    try:
        _mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        _mqtt_client.loop_start()
    except Exception as e:
        logger.warning(f"MQTT no disponible: {e}")


def _publicar_evento(aula_id: str, evento: dict):
    """Publica el resultado del escaneo en el topic MQTT campus/aula/{aula_id}/scan."""
    if _mqtt_client and _mqtt_client.is_connected():
        topic = f"campus/aula/{aula_id}/scan"
        _mqtt_client.publish(topic, json.dumps(evento), qos=1)


# ── Validación local del JWT ──────────────────────────────────────────────────
def _validar_jwt_local(token: str) -> dict | None:
    """Valida la firma RS256 y el nonce del JWT localmente antes de llamar al backend."""
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
        if payload.get("type") != "qr":
            return None
        nonce = payload.get("nonce", "")
        if _nonce_ya_usado(nonce):
            logger.warning("Nonce repetido — posible replay attack")
            return None
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("QR expirado")
        return None
    except jwt.InvalidTokenError as e:
        logger.warning(f"JWT inválido: {e}")
        return None


# ── Llamada al backend ────────────────────────────────────────────────────────
def _llamar_backend(qr_token: str, aula_id: str, ip_edge: str) -> dict:
    """Envía el token al backend para validación final y registro de asistencia/acceso."""
    try:
        resp = requests.post(
            f"{BACKEND_URL}/acceso/validar-qr",
            json={"qr_token": qr_token, "aula_id": aula_id, "ip_edge": ip_edge},
            timeout=5,
        )
        logger.info(f"Backend HTTP {resp.status_code} | body: {resp.text[:300]}")
        return resp.json()
    except requests.exceptions.Timeout:
        logger.error("Backend: timeout")
        return {"acceso": "denegado", "motivo": "backend_timeout"}
    except Exception as e:
        logger.error(f"Backend: error {e}")
        return {"acceso": "denegado", "motivo": "backend_error"}


# ── Bucle principal ───────────────────────────────────────────────────────────
def _procesar_token_con_resultado(token: str, aula_id: str, aula_uuid: str, ip_edge: str) -> dict:
    """Orquesta la validación completa del QR: local (si es JWT) → backend → LED → MQTT. Retorna el resultado."""
    logger.info(f"QR recibido (len={len(token)})")

    # Si es código corto (≤20 chars) saltar validación local y enviar al backend
    es_codigo_corto = len(token) <= 20
    if not es_codigo_corto:
        payload = _validar_jwt_local(token)
        if payload is None:
            logger.info("Validación local FALLIDA → LED rojo")
            _publicar_evento(aula_id, {
                "resultado": "denegado", "motivo": "jwt_invalido_local",
                "aula_id": aula_id, "ts": datetime.now(timezone.utc).isoformat()
            })
            _activar_led(permitido=False)
            return {"acceso": "denegado", "motivo": "jwt_invalido_local"}

    resultado = _llamar_backend(token, aula_uuid, ip_edge)
    permitido = resultado.get("acceso") == "permitido"

    logger.info(
        f"Backend → {resultado.get('acceso')} | "
        f"{resultado.get('nombre','?')} | {resultado.get('motivo','')}"
    )

    _publicar_evento(aula_id, {
        "resultado": resultado.get("acceso"),
        "nombre":    resultado.get("nombre"),
        "codigo":    resultado.get("codigo"),
        "motivo":    resultado.get("motivo"),
        "aula_id":   aula_id,
        "ts":        datetime.now(timezone.utc).isoformat(),
    })

    _activar_led(permitido=permitido)
    return resultado


def _procesar_token(token: str, aula_id: str, aula_uuid: str, ip_edge: str):
    _procesar_token_con_resultado(token, aula_id, aula_uuid, ip_edge)


def run(aula_id: str, backend_url: str, aula_uuid: str, ip_edge: str, simulate: bool = False):
    """Bucle principal del edge node: inicializa MQTT y cámara, procesa QRs en tiempo real."""
    global BACKEND_URL
    BACKEND_URL = backend_url

    logger.info(f"Edge node iniciado — Aula: {aula_id} | Backend: {backend_url}")
    if simulate:
        logger.info("MODO SIMULACIÓN — sin cámara ni LEDs físicos")
    _init_mqtt(aula_id, aula_uuid)

    if simulate:
        # ── Modo simulación: leer token desde teclado ─────────────────────
        print("\n" + "="*60)
        print("  SIMULADOR EDGE NODE — Smart Campus")
        print(f"  Aula: {aula_id}")
        print("  Ctrl+C para salir.")
        print("="*60)

        puerta_abierta = False
        _estado_sesion["cerrar"] = False
        _estado_sesion["hora_fin_clase"] = None

        def _hora_fin_pasada() -> bool:
            hfc = _estado_sesion.get("hora_fin_clase")
            if not hfc:
                return False
            return datetime.now().strftime("%H:%M") >= hfc

        try:
            while True:
                # ── Cierre manual desde el dashboard ──────────────────────
                if puerta_abierta and _estado_sesion["cerrar"]:
                    _estado_sesion["cerrar"] = False
                    _estado_sesion["hora_fin_clase"] = None
                    puerta_abierta = False
                    print("\n\033[93m  ⏹  Puerta cerrada desde el dashboard\033[0m\n")
                    continue

                # ── Cierre automático al terminar la clase ─────────────────
                if puerta_abierta and _hora_fin_pasada():
                    hfc = _estado_sesion["hora_fin_clase"]
                    _estado_sesion["hora_fin_clase"] = None
                    puerta_abierta = False
                    print(f"\n\033[93m  ⏹  Clase terminada ({hfc}) — puerta cerrada\033[0m\n")
                    continue

                if not puerta_abierta:
                    print("\n\033[90m[ Esperando QR del profesor para abrir ]\033[0m")
                    token = input("QR profesor> ").strip()
                else:
                    hfc = _estado_sesion.get("hora_fin_clase", "?")
                    print(f"\n\033[90m[ Puerta abierta hasta {hfc} — pega QR del estudiante, o escribe 'cerrar' ]\033[0m")
                    print("QR estudiante> ", end="", flush=True)
                    token = None
                    while token is None:
                        listo = select.select([sys.stdin], [], [], 0.5)[0]
                        if listo:
                            token = sys.stdin.readline().strip()
                        elif _estado_sesion["cerrar"]:
                            _estado_sesion["cerrar"] = False
                            _estado_sesion["hora_fin_clase"] = None
                            puerta_abierta = False
                            print("\n\033[93m  ⏹  Puerta cerrada desde el dashboard\033[0m\n")
                            token = ""
                            break
                        elif _hora_fin_pasada():
                            hfc = _estado_sesion["hora_fin_clase"]
                            _estado_sesion["hora_fin_clase"] = None
                            puerta_abierta = False
                            print(f"\n\033[93m  ⏹  Clase terminada ({hfc}) — puerta cerrada\033[0m\n")
                            token = ""
                            break

                if not token:
                    continue

                if token.lower() == "cerrar":
                    _estado_sesion["hora_fin_clase"] = None
                    puerta_abierta = False
                    print("\n\033[93m  ⏹  Puerta cerrada manualmente\033[0m\n")
                    continue

                resultado = _procesar_token_con_resultado(token, aula_id, aula_uuid, ip_edge)

                if not puerta_abierta:
                    if resultado and resultado.get("acceso") == "permitido" and resultado.get("rol") == "docente":
                        puerta_abierta = True
                        hfc = _estado_sesion.get("hora_fin_clase", "?")
                        print(f"\n\033[44m\033[97m  🎓  Sesión abierta — Prof. {resultado.get('nombre','')}  \033[0m")
                        print(f"\033[96m  Puerta abierta hasta {hfc} — pidan pasar a los estudiantes.\033[0m\n")

        except KeyboardInterrupt:
            logger.info("Simulación detenida")
        return

    # ── Modo cámara real ──────────────────────────────────────────────────
    import cv2
    from pyzbar import pyzbar
    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        logger.error("No se pudo abrir la cámara. Usa --simulate para modo sin cámara.")
        return

    ultimo_token  = None
    ultimo_ts     = 0
    COOLDOWN      = 30
    frame_count   = 0
    puerta_abierta = False

    logger.info("Cámara lista. Esperando QR del profesor para abrir sesión...")

    try:
        while True:
            # ── Cierre manual o automático ────────────────────────────────
            if puerta_abierta and _estado_sesion["cerrar"]:
                _estado_sesion["cerrar"] = False
                _estado_sesion["hora_fin_clase"] = None
                puerta_abierta = False
                logger.info("Puerta cerrada desde el dashboard")

            if puerta_abierta and _estado_sesion.get("hora_fin_clase"):
                if datetime.now().strftime("%H:%M") >= _estado_sesion["hora_fin_clase"]:
                    hfc = _estado_sesion["hora_fin_clase"]
                    _estado_sesion["hora_fin_clase"] = None
                    puerta_abierta = False
                    logger.info(f"Clase terminada ({hfc}) — puerta cerrada")

            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue

            frame_count += 1
            if frame_count % 100 == 0:
                hfc = _estado_sesion.get("hora_fin_clase", "?")
                if puerta_abierta:
                    logger.info(f"Procesando frames... ({frame_count}) — puerta abierta hasta {hfc}")
                else:
                    logger.info(f"Procesando frames... ({frame_count}) — esperando QR del profesor")

            qrs_detectados = pyzbar.decode(frame)
            if qrs_detectados:
                logger.info(f"QR detectado por pyzbar: {len(qrs_detectados)} código(s)")

            for qr in qrs_detectados:
                token = qr.data.decode("utf-8")
                ahora = time.time()
                if token == ultimo_token and (ahora - ultimo_ts) < COOLDOWN:
                    continue
                ultimo_token = token
                ultimo_ts    = ahora
                resultado = _procesar_token_con_resultado(token, aula_id, aula_uuid, ip_edge)

                if not puerta_abierta:
                    if resultado.get("acceso") == "permitido" and resultado.get("rol") == "docente":
                        puerta_abierta = True
                        hfc = _estado_sesion.get("hora_fin_clase", "?")
                        logger.info(f"*** SESIÓN ABIERTA — Prof. {resultado.get('nombre','')} — puerta hasta {hfc} ***")

            # Solo mostrar ventana si hay display disponible
            if os.environ.get("DISPLAY"):
                cv2.imshow("Smart Campus — Lector QR", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break

    except KeyboardInterrupt:
        logger.info("Detenido por el usuario")
    finally:
        cap.release()
        cv2.destroyAllWindows()
        if _mqtt_client:
            _mqtt_client.loop_stop()
            _mqtt_client.disconnect()
        if _gpio_disponible:
            led_verde.off()
            led_rojo.off()


# ── Entrypoint ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Smart Campus Edge Node")
    parser.add_argument("--aula",        required=True, help="Código del aula (ej: AULA-101)")
    parser.add_argument("--aula-uuid",   required=True, help="UUID del aula en la BD")
    parser.add_argument("--backend",     default="http://localhost:8000", help="URL del backend")
    parser.add_argument("--mqtt-host",   default="localhost", help="Host del broker MQTT")
    parser.add_argument("--ip",          default="0.0.0.0", help="IP de este nodo edge")
    parser.add_argument("--simulate",    action="store_true", help="Modo simulación sin cámara")
    args = parser.parse_args()

    MQTT_HOST = args.mqtt_host
    run(
        aula_id=args.aula,
        backend_url=args.backend,
        aula_uuid=args.aula_uuid,
        ip_edge=args.ip,
        simulate=args.simulate,
    )
