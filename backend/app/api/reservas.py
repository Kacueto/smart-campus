from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.auth.schemas import TokenData
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/reservas", tags=["Reservas"])

class ReservaCreate(BaseModel):
    aula_id: str
    inicio: datetime
    duracion_horas: int

@router.get("/aulas-disponibles")
async def aulas_disponibles(
    fecha: str,
    hora_inicio: str,
    duracion_horas: int,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna aulas sin clase ni reserva activa en el rango fecha/hora solicitado."""
    inicio_dt = datetime.strptime(f"{fecha} {hora_inicio}", "%Y-%m-%d %H:%M")
    fin_dt    = inicio_dt + timedelta(hours=duracion_horas)
    dia_semana = inicio_dt.isoweekday()  # 1=lunes ... 7=domingo

    result = await db.execute(text("""
        SELECT a.id, a.codigo, a.nombre, a.edificio, a.capacidad
        FROM aulas a
        WHERE a.activa = true
        AND a.id NOT IN (
            SELECT h.aula_id FROM horarios h
            WHERE h.dia_semana = :dia_semana
            AND h.activo = true
            AND h.hora_inicio < :hora_fin
            AND h.hora_fin    > :hora_inicio
        )
        AND a.id NOT IN (
            SELECT r.aula_id FROM reservas r
            WHERE r.estado = 'activa'
            AND r.inicio < :fin
            AND r.fin    > :inicio
        )
        ORDER BY a.edificio, a.nombre
    """), {
        "dia_semana":  dia_semana,
        "hora_inicio": inicio_dt.time(),
        "hora_fin":    fin_dt.time(),
        "inicio":      inicio_dt,
        "fin":         fin_dt,
    })

    rows = result.fetchall()
    return [
        {
            "id":        str(row.id),
            "codigo":    row.codigo,
            "nombre":    row.nombre,
            "edificio":  row.edificio,
            "capacidad": row.capacidad,
        }
        for row in rows
    ]

@router.post("/crear")
async def crear_reserva(
    data: ReservaCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Crea una reserva verificando traslapes con otras reservas y clases programadas."""
    if data.duracion_horas not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La duración debe ser 1, 2 o 3 horas")

    if data.inicio < datetime.now():
        raise HTTPException(status_code=400, detail="No puedes reservar en el pasado")

    fin = data.inicio + timedelta(hours=data.duracion_horas)
    dia_semana = data.inicio.isoweekday()

    traslape = await db.execute(text("""
        SELECT COUNT(*) FROM reservas
        WHERE aula_id = :aula_id
        AND estado = 'activa'
        AND inicio < :fin
        AND fin > :inicio
    """), {"aula_id": data.aula_id, "inicio": data.inicio, "fin": fin})

    if traslape.scalar() > 0:
        raise HTTPException(status_code=409, detail="El aula ya está reservada en ese horario")

    clase = await db.execute(text("""
        SELECT COUNT(*) FROM horarios
        WHERE aula_id = :aula_id
        AND activo = true
        AND dia_semana = :dia_semana
        AND hora_inicio < :hora_fin
        AND hora_fin > :hora_inicio
    """), {
        "aula_id":    data.aula_id,
        "dia_semana": dia_semana,
        "hora_inicio": data.inicio.time(),
        "hora_fin":    fin.time(),
    })

    if clase.scalar() > 0:
        raise HTTPException(status_code=409, detail="Hay una clase programada en ese horario")

    await db.execute(text("""
        INSERT INTO reservas (user_id, aula_id, inicio, fin, estado)
        VALUES (:user_id, :aula_id, :inicio, :fin, 'activa')
    """), {
        "user_id": current_user.user_id,
        "aula_id": data.aula_id,
        "inicio":  data.inicio,
        "fin":     fin,
    })
    await db.commit()
    return {"message": "Reserva creada correctamente"}

@router.get("/mis-reservas")
async def mis_reservas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retorna las reservas activas y futuras del usuario autenticado."""
    result = await db.execute(text("""
        SELECT r.id, r.inicio, r.fin, r.estado,
               a.nombre as aula, a.edificio, a.codigo as aula_codigo
        FROM reservas r
        JOIN aulas a ON r.aula_id = a.id
        WHERE r.user_id = :user_id
        AND r.estado = 'activa'
        AND r.fin > NOW()
        ORDER BY r.inicio ASC
    """), {"user_id": current_user.user_id})

    rows = result.fetchall()
    return [
        {
            "id":          str(row.id),
            "inicio":      row.inicio.strftime("%d/%m/%Y %H:%M"),
            "fin":         row.fin.strftime("%H:%M"),
            "estado":      row.estado,
            "aula":        f"{row.edificio} - {row.aula}" if row.edificio else row.aula,
            "aula_codigo": row.aula_codigo,
        }
        for row in rows
    ]

@router.delete("/cancelar/{reserva_id}")
async def cancelar_reserva(
    reserva_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancela una reserva activa del usuario siempre que no haya comenzado aún."""
    result = await db.execute(text("""
        SELECT id, inicio FROM reservas
        WHERE id = :id AND user_id = :user_id AND estado = 'activa'
    """), {"id": reserva_id, "user_id": current_user.user_id})

    reserva = result.fetchone()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.inicio < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="No puedes cancelar una reserva que ya inició")

    await db.execute(text("""
        UPDATE reservas SET estado = 'cancelada' WHERE id = :id
    """), {"id": reserva_id})
    await db.commit()
    return {"message": "Reserva cancelada correctamente"}
