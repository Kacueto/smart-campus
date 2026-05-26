from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import TokenData
from app.middleware.dependencies import get_current_user
from app.controllers import asistencia_controller

router = APIRouter(prefix="/asistencia", tags=["Asistencia"])


@router.get("/mis-estadisticas")
async def mis_estadisticas(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await asistencia_controller.get_mis_estadisticas(current_user, db)
