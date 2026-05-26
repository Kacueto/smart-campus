from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import TokenData
from app.schemas.reserva import ReservaCreate
from app.middleware.dependencies import get_current_user
from app.controllers import reserva_controller

router = APIRouter(prefix="/reservas", tags=["Reservas"])


@router.get("/aulas-disponibles")
async def aulas_disponibles(
    fecha: str,
    hora_inicio: str,
    duracion_horas: int,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reserva_controller.get_aulas_disponibles(
        fecha, hora_inicio, duracion_horas, current_user, db
    )


@router.post("/crear")
async def crear_reserva(
    data: ReservaCreate,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reserva_controller.crear_reserva(data, current_user, db)


@router.get("/mis-reservas")
async def mis_reservas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reserva_controller.get_mis_reservas(current_user, db)


@router.delete("/cancelar/{reserva_id}")
async def cancelar_reserva(
    reserva_id: str,
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await reserva_controller.cancelar_reserva(reserva_id, current_user, db)
