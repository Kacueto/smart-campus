import os
import logging
from datetime import datetime, timezone
from influxdb_client import InfluxDBClient, Point, WritePrecision
from influxdb_client.client.write_api import SYNCHRONOUS

logger = logging.getLogger(__name__)

_INFLUX_URL   = os.getenv("INFLUXDB_URL",   "http://localhost:8086")
_INFLUX_TOKEN = os.getenv("INFLUXDB_TOKEN",  "smartcampus-influx-token-2024")
_INFLUX_ORG   = os.getenv("INFLUXDB_ORG",    "smart-campus")
_INFLUX_BUCKET = os.getenv("INFLUXDB_BUCKET", "accesos")

_client: InfluxDBClient | None = None
_write_api = None


def _get_write_api():
    global _client, _write_api
    if _write_api is None:
        try:
            _client = InfluxDBClient(url=_INFLUX_URL, token=_INFLUX_TOKEN, org=_INFLUX_ORG)
            _write_api = _client.write_api(write_options=SYNCHRONOUS)
        except Exception as e:
            logger.warning(f"influx_client: no se pudo conectar → {e}")
    return _write_api


def write_acceso(
    user_id: str,
    codigo: str,
    rol: str,
    aula_id: str,
    aula_codigo: str,
    resultado: str,
    motivo: str,
    ip_edge: str | None = None,
):
    api = _get_write_api()
    if api is None:
        return
    try:
        point = (
            Point("acceso")
            .tag("resultado", resultado)
            .tag("motivo", motivo)
            .tag("aula", aula_codigo)
            .tag("rol", rol)
            .tag("ip_edge", ip_edge or "unknown")
            .field("value", 1)
            .field("usuario", codigo)
            .time(datetime.now(timezone.utc), WritePrecision.SECONDS)
        )
        api.write(bucket=_INFLUX_BUCKET, org=_INFLUX_ORG, record=point)
    except Exception as e:
        logger.warning(f"influx write_acceso error: {e}")


def write_asistencia(
    user_id: str,
    codigo: str,
    aula_codigo: str,
    horario_id: str,
    materia: str,
):
    api = _get_write_api()
    if api is None:
        return
    try:
        point = (
            Point("asistencia")
            .tag("aula", aula_codigo)
            .tag("materia", materia)
            .tag("horario_id", horario_id)
            .field("value", 1)
            .field("usuario", codigo)
            .time(datetime.now(timezone.utc), WritePrecision.SECONDS)
        )
        api.write(bucket=_INFLUX_BUCKET, org=_INFLUX_ORG, record=point)
    except Exception as e:
        logger.warning(f"influx write_asistencia error: {e}")


def write_alerta(tipo: str, detalle: str, aula_codigo: str = ""):
    api = _get_write_api()
    if api is None:
        return
    try:
        point = (
            Point("alerta")
            .tag("tipo", tipo)
            .tag("aula", aula_codigo)
            .field("value", 1)
            .field("detalle", detalle)
            .time(datetime.now(timezone.utc), WritePrecision.SECONDS)
        )
        api.write(bucket=_INFLUX_BUCKET, org=_INFLUX_ORG, record=point)
    except Exception as e:
        logger.warning(f"influx write_alerta error: {e}")
