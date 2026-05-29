from datetime import datetime, timedelta, timezone
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.schemas.auth import TokenData
from app.middleware.jwt_handler import create_qr_token
from app import mqtt_client

DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles",
        4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


async def get_mis_clases_hoy(current_user: TokenData, db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            a.nombre as aula,
            a.edificio,
            a.codigo as aula_codigo,
            a.id as aula_id,
            COUNT(i.user_id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id
        AND h.dia_semana = EXTRACT(ISODOW FROM NOW() AT TIME ZONE 'America/Bogota')::int
        AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.hora_inicio
    """), {"docente_id": current_user.user_id})

    rows = result.fetchall()
    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               DIAS.get(row.dia_semana, ""),
            "hora_inicio":       row.hora_inicio[:5],
            "hora_fin":          row.hora_fin[:5],
            "horario":           f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":              f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":           str(row.aula_id),
            "aula_codigo":       row.aula_codigo,
            "total_estudiantes": row.total_estudiantes,
        }
        for row in rows
    ]


async def get_todas_mis_clases(current_user: TokenData, db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            a.nombre as aula,
            a.edificio,
            a.id as aula_id,
            COUNT(i.user_id) as total_estudiantes
        FROM horarios h
        JOIN aulas a ON h.aula_id = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        WHERE h.docente_id = :docente_id AND h.activo = true
        GROUP BY h.id, a.id
        ORDER BY h.dia_semana, h.hora_inicio
    """), {"docente_id": current_user.user_id})

    rows = result.fetchall()
    return [
        {
            "id":                str(row.id),
            "materia":           row.materia,
            "dia":               DIAS.get(row.dia_semana, ""),
            "dia_semana":        row.dia_semana,
            "hora_inicio":       row.hora_inicio[:5],
            "hora_fin":          row.hora_fin[:5],
            "horario":           f"{row.hora_inicio[:5]} - {row.hora_fin[:5]}",
            "aula":              f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_id":           str(row.aula_id),
            "total_estudiantes": row.total_estudiantes,
        }
        for row in rows
    ]


async def generar_qr(
    aula_id: str, minutos: int, horario_id: str,
    current_user: TokenData, db: AsyncSession,
) -> dict:
    COLOMBIA_TZ = timezone(timedelta(hours=-5))
    ahora = datetime.now(COLOMBIA_TZ).strftime("%H:%M")

    horario = await db.execute(
        text("SELECT hora_inicio::text, hora_fin::text FROM horarios WHERE id = :id AND docente_id = :docente_id"),
        {"id": horario_id, "docente_id": current_user.user_id},
    )
    row = horario.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Clase no encontrada")
    hora_inicio = row[0][:5]
    hora_fin = row[1][:5]

    # Permite abrir hasta 10 minutos antes del inicio
    inicio_con_gracia = (
        datetime.strptime(hora_inicio, "%H:%M") - timedelta(minutes=10)
    ).strftime("%H:%M")

    if ahora < inicio_con_gracia:
        raise HTTPException(
            status_code=400,
            detail=f"La clase no comienza hasta las {hora_inicio}",
        )
    if ahora > hora_fin:
        raise HTTPException(status_code=400, detail="Esta clase ya terminó")

    if minutos < 5 or minutos > 15:
        raise HTTPException(status_code=400, detail="Los minutos deben estar entre 5 y 15")

    qr_token = create_qr_token(
        current_user.user_id,
        current_user.codigo,
        current_user.role,
        aula_id,
    )

    fin_sesion = (datetime.now(COLOMBIA_TZ) + timedelta(minutes=minutos)).isoformat()
    mqtt_client.publish_control(aula_id, {
        "accion":        "abrir_sesion",
        "minutos":       minutos,
        "fin_sesion":    fin_sesion,
        "hora_fin_clase": hora_fin,  # puerta abierta hasta el fin de la clase
    })

    return {
        "qr_token":   qr_token,
        "expires_in": 30,
        "minutos":    minutos,
        "horario_id": horario_id,
        "aula_id":    aula_id,
    }


def cerrar_sesion(aula_id: str) -> dict:
    mqtt_client.publish_control(aula_id, {"accion": "cerrar_sesion"})
    return {"message": "Sesión cerrada"}


async def get_asistencia_sesion(horario_id: str, db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            u.nombre,
            u.codigo,
            at.timestamp_in,
            at.metodo
        FROM asistencia at
        JOIN users u ON at.user_id = u.id
        WHERE at.horario_id = :horario_id
        AND at.timestamp_in >= NOW() - INTERVAL '2 hours'
        AND at.valido = true
        ORDER BY at.timestamp_in DESC
    """), {"horario_id": horario_id})

    rows = result.fetchall()
    return [
        {
            "nombre": r.nombre,
            "codigo": r.codigo,
            "hora":   r.timestamp_in.strftime("%H:%M"),
            "metodo": r.metodo,
        }
        for r in rows
    ]


async def get_lista_clase(horario_id: str, db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            u.nombre,
            u.codigo,
            MAX(at.timestamp_in) FILTER (
                WHERE at.horario_id = :horario_id
                AND at.timestamp_in >= NOW() - INTERVAL '2 hours'
                AND at.valido = true
            ) AS timestamp_in
        FROM inscripciones i
        JOIN users u ON u.id = i.user_id
        LEFT JOIN asistencia at ON at.user_id = i.user_id
            AND at.horario_id = :horario_id
            AND at.timestamp_in >= NOW() - INTERVAL '2 hours'
            AND at.valido = true
        WHERE i.horario_id = :horario_id
        GROUP BY u.nombre, u.codigo
        ORDER BY u.nombre
    """), {"horario_id": horario_id})

    rows = result.fetchall()
    return [
        {
            "nombre":  r.nombre,
            "codigo":  r.codigo,
            "asistio": r.timestamp_in is not None,
            "hora":    r.timestamp_in.strftime("%H:%M") if r.timestamp_in else None,
        }
        for r in rows
    ]
