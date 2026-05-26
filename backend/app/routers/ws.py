from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import text
from app.database import AsyncSessionLocal
from app.ws_manager import manager

router = APIRouter()


@router.websocket("/ws/asistencia-sesion/{horario_id}")
async def ws_asistencia(horario_id: str, websocket: WebSocket):
    await manager.connect(horario_id, websocket)
    try:
        # Enviar lista actual al conectar
        async with AsyncSessionLocal() as db:
            result = await db.execute(text("""
                SELECT u.nombre, u.codigo, at.timestamp_in, at.metodo
                FROM asistencia at
                JOIN users u ON at.user_id = u.id
                WHERE at.horario_id = :horario_id
                  AND at.timestamp_in >= NOW() - INTERVAL '2 hours'
                  AND at.valido = true
                ORDER BY at.timestamp_in DESC
            """), {"horario_id": horario_id})
            rows = result.fetchall()

        await websocket.send_json({
            "type": "init",
            "asistentes": [
                {
                    "nombre": r.nombre,
                    "codigo": r.codigo,
                    "hora":   r.timestamp_in.strftime("%H:%M"),
                    "metodo": r.metodo,
                }
                for r in rows
            ],
        })

        # Mantener conexión viva
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        manager.disconnect(horario_id, websocket)
