"""
Smart Campus — Edge Node
Corre en Raspberry Pi 5 (Python 3.11, sin Docker)

Dependencias:
    pip install opencv-python pyzbar paho-mqtt PyJWT cryptography requests

Uso:
    python3 main.py --aula AULA-101 --backend http://<server-ip>:8000
"""

import argparse
import time
import logging
import json
import requests
import jwt
import cv2
from pyzbar import pyzbar
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

# ── Anti-replay local (caché de nonces procesados en los últimos 60s) ─────────
_nonce_cache: dict[str, float] = {}


def _nonce_ya_usado(nonce: str) -> bool:
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
    color = "VERDE" if permitido else "ROJO"
    logger.info(f"LED {color} encendido por {LED_DURACION}s")
    if _gpio_disponible:
        led = led_verde if permitido else led_rojo
        led.on()
        time.sleep(LED_DURACION)
        led.off()
    else:
        time.sleep(LED_DURACION)


# ── MQTT ──────────────────────────────────────────────────────────────────────
_mqtt_client: mqtt.Client = None


def _init_mqtt(aula_id: str):
    global _mqtt_client
    _mqtt_client = mqtt.Client(client_id=f"edge-{aula_id}", protocol=mqtt.MQTTv311)

    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            logger.info("MQTT: conectado al broker")
        else:
            logger.error(f"MQTT: error rc={rc}")

    _mqtt_client.on_connect = on_connect
    try:
        _mqtt_client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
        _mqtt_client.loop_start()
    except Exception as e:
        logger.warning(f"MQTT no disponible: {e}")


def _publicar_evento(aula_id: str, evento: dict):
    if _mqtt_client and _mqtt_client.is_connected():
        topic = f"campus/aula/{aula_id}/scan"
        _mqtt_client.publish(topic, json.dumps(evento), qos=1)


# ── Validación local del JWT ──────────────────────────────────────────────────
def _validar_jwt_local(token: str) -> dict | None:
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
    try:
        resp = requests.post(
            f"{BACKEND_URL}/acceso/validar-qr",
            json={"qr_token": qr_token, "aula_id": aula_id, "ip_edge": ip_edge},
            timeout=5,
        )
        return resp.json()
    except requests.exceptions.Timeout:
        logger.error("Backend: timeout")
        return {"acceso": "denegado", "motivo": "backend_timeout"}
    except Exception as e:
        logger.error(f"Backend: error {e}")
        return {"acceso": "denegado", "motivo": "backend_error"}


# ── Bucle principal ───────────────────────────────────────────────────────────
def run(aula_id: str, backend_url: str, aula_uuid: str, ip_edge: str):
    global BACKEND_URL
    BACKEND_URL = backend_url

    logger.info(f"Edge node iniciado — Aula: {aula_id} | Backend: {backend_url}")
    _init_mqtt(aula_id)

    cap = cv2.VideoCapture(CAMERA_INDEX)
    if not cap.isOpened():
        logger.error("No se pudo abrir la cámara. Verifica el índice o el dispositivo.")
        return

    ultimo_token = None
    ultimo_ts    = 0
    COOLDOWN     = 3  # segundos entre escaneos del mismo QR

    logger.info("Cámara lista. Esperando QR...")

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.warning("Frame vacío, reintentando...")
                time.sleep(0.1)
                continue

            qrs = pyzbar.decode(frame)
            for qr in qrs:
                token = qr.data.decode("utf-8")
                ahora = time.time()

                # Evitar procesar el mismo QR dos veces seguidas
                if token == ultimo_token and (ahora - ultimo_ts) < COOLDOWN:
                    continue

                ultimo_token = token
                ultimo_ts    = ahora

                logger.info(f"QR detectado (len={len(token)})")

                # 1. Validación local rápida (sin red)
                payload = _validar_jwt_local(token)
                if payload is None:
                    logger.info("Validación local FALLIDA → LED rojo")
                    _publicar_evento(aula_id, {
                        "resultado": "denegado", "motivo": "jwt_invalido_local",
                        "aula_id": aula_id, "ts": datetime.now(timezone.utc).isoformat()
                    })
                    _activar_led(permitido=False)
                    continue

                # 2. Validación completa en el backend
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

            # Mostrar frame (opcional — comentar si corre headless)
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
    args = parser.parse_args()

    MQTT_HOST = args.mqtt_host
    run(
        aula_id=args.aula,
        backend_url=args.backend,
        aula_uuid=args.aula_uuid,
        ip_edge=args.ip,
    )
