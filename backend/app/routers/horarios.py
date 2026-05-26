from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import TokenData
from app.middleware.dependencies import get_current_user
from app.controllers import horario_controller

router = APIRouter(prefix="/horarios", tags=["Horarios"])


@router.get("/mis-clases")
async def mis_clases(
    current_user: TokenData = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await horario_controller.get_mis_clases(current_user, db)
