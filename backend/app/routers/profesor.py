from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import TokenData, UserRole
from app.middleware.dependencies import require_role
from app.controllers import profesor_controller

router = APIRouter(prefix="/profesor", tags=["Profesor"])


@router.get("/mis-clases-hoy")
async def mis_clases_hoy(
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    return await profesor_controller.get_mis_clases_hoy(current_user, db)


@router.get("/todas-mis-clases")
async def todas_mis_clases(
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    return await profesor_controller.get_todas_mis_clases(current_user, db)


@router.post("/generar-qr")
async def generar_qr(
    aula_id: str,
    minutos: int,
    horario_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    return await profesor_controller.generar_qr(aula_id, minutos, horario_id, current_user, db)


@router.post("/cerrar-sesion")
async def cerrar_sesion(
    aula_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
):
    return profesor_controller.cerrar_sesion(aula_id)


@router.get("/asistencia-sesion/{horario_id}")
async def asistencia_sesion(
    horario_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    return await profesor_controller.get_asistencia_sesion(horario_id, db)


@router.get("/lista-clase/{horario_id}")
async def lista_clase(
    horario_id: str,
    current_user: TokenData = Depends(require_role(UserRole.docente)),
    db: AsyncSession = Depends(get_db),
):
    return await profesor_controller.get_lista_clase(horario_id, db)
