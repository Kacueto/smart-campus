from collections import defaultdict
from fastapi import WebSocket
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = defaultdict(list)

    async def connect(self, horario_id: str, ws: WebSocket):
        await ws.accept()
        self._connections[horario_id].append(ws)
        logger.info(f"WS: cliente conectado a horario {horario_id} ({len(self._connections[horario_id])} total)")

    def disconnect(self, horario_id: str, ws: WebSocket):
        try:
            self._connections[horario_id].remove(ws)
        except ValueError:
            pass
        logger.info(f"WS: cliente desconectado de horario {horario_id}")

    async def broadcast(self, horario_id: str, payload: dict):
        dead = []
        for ws in self._connections[horario_id]:
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self._connections[horario_id].remove(ws)


manager = ConnectionManager()
