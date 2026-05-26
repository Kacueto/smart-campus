"""Controlador de reservas: listar aulas disponibles, crear/cancelar/listar reservas propias."""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.views.auth_view import TokenData
from app.views.reserva_view import ReservaCreate
from app.models import aula_model, reserva_model

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.get("/aulas-disponibles")
async def aulas_disponibles(
    fecha: str,
    hora_inicio: str,
    duracion_horas: int,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna aulas sin clase ni reserva activa en el rango fecha/hora solicitado."""
    inicio_dt = datetime.strptime(f"{fecha} {hora_inicio}", "%Y-%m-%d %H:%M")
    fin_dt    = inicio_dt + timedelta(hours=duracion_horas)
    dia_semana = inicio_dt.isoweekday()  # 1=lunes ... 7=domingo

    rows = await aula_model.listar_aulas_disponibles(
        db,
        dia_semana=dia_semana,
        hora_inicio=inicio_dt.time(),
        hora_fin=fin_dt.time(),
        inicio_dt=inicio_dt,
        fin_dt=fin_dt,
    )
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
    db: AsyncSession = Depends(get_db),
):
    """Crea una reserva verificando traslapes con otras reservas y clases programadas."""
    if data.duracion_horas not in [1, 2, 3]:
        raise HTTPException(status_code=400, detail="La duración debe ser 1, 2 o 3 horas")

    if data.inicio < datetime.now():
        raise HTTPException(status_code=400, detail="No puedes reservar en el pasado")

    fin = data.inicio + timedelta(hours=data.duracion_horas)
    dia_semana = data.inicio.isoweekday()

    if await reserva_model.contar_traslape_reservas(db, data.aula_id, data.inicio, fin) > 0:
        raise HTTPException(status_code=409, detail="El aula ya está reservada en ese horario")

    if await reserva_model.contar_traslape_clases(
        db, data.aula_id, dia_semana, data.inicio.time(), fin.time()
    ) > 0:
        raise HTTPException(status_code=409, detail="Hay una clase programada en ese horario")

    await reserva_model.crear_reserva(
        db,
        user_id=current_user.user_id,
        aula_id=data.aula_id,
        inicio=data.inicio,
        fin=fin,
    )
    return {"message": "Reserva creada correctamente"}


@router.get("/mis-reservas")
async def mis_reservas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retorna las reservas activas y futuras del usuario autenticado."""
    rows = await reserva_model.listar_mis_reservas(db, current_user.user_id)
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
    db: AsyncSession = Depends(get_db),
):
    """Cancela una reserva activa del usuario siempre que no haya comenzado aún."""
    reserva = await reserva_model.obtener_reserva_para_cancelar(db, reserva_id, current_user.user_id)
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if reserva.inicio < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="No puedes cancelar una reserva que ya inició")

    await reserva_model.cancelar_reserva(db, reserva_id)
    return {"message": "Reserva cancelada correctamente"}
