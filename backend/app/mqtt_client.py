import json
import logging
import paho.mqtt.client as mqtt
from app.config import settings

logger = logging.getLogger(__name__)

# Tópicos
TOPIC_SCAN      = "campus/aula/+/scan"      # edge publica escaneos
TOPIC_RESULTADO = "campus/aula/{aula_id}/resultado"  # backend publica resultado

_client: mqtt.Client = None


def get_client() -> mqtt.Client:
    return _client


def publish_resultado(aula_id: str, resultado: dict):
    """Publica el resultado de validación al nodo edge correspondiente."""
    if _client and _client.is_connected():
        topic = TOPIC_RESULTADO.format(aula_id=aula_id)
        _client.publish(topic, json.dumps(resultado), qos=1)
        logger.info(f"MQTT → {topic}: {resultado['acceso']}")


def _on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("MQTT: conectado al broker")
        client.subscribe(TOPIC_SCAN, qos=1)
        logger.info(f"MQTT: suscrito a {TOPIC_SCAN}")
    else:
        logger.error(f"MQTT: error de conexión rc={rc}")


def _on_message(client, userdata, msg):
    """
    Cuando el edge publica en campus/aula/{id}/scan,
    el backend recibe el QR token y puede procesarlo.
    (El edge también puede llamar directamente al REST endpoint.)
    """
    try:
        data = json.loads(msg.payload.decode())
        aula_id = msg.topic.split("/")[2]
        logger.info(f"MQTT ← {msg.topic}: scan de {data.get('codigo','?')}")
    except Exception as e:
        logger.error(f"MQTT: error procesando mensaje: {e}")


def _on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning(f"MQTT: desconexión inesperada rc={rc}")


def start_mqtt():
    global _client
    _client = mqtt.Client(client_id=settings.MQTT_CLIENT_ID, protocol=mqtt.MQTTv311)
    _client.on_connect    = _on_connect
    _client.on_message    = _on_message
    _client.on_disconnect = _on_disconnect

    try:
        _client.connect(settings.MQTT_HOST, settings.MQTT_PORT, keepalive=60)
        _client.loop_start()
        logger.info(f"MQTT: cliente iniciado → {settings.MQTT_HOST}:{settings.MQTT_PORT}")
    except Exception as e:
        logger.error(f"MQTT: no se pudo conectar al broker: {e}")


def stop_mqtt():
    if _client:
        _client.loop_stop()
        _client.disconnect()
        logger.info("MQTT: cliente detenido")
