from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.acceso import ScanRequest, AccesoResponse
from app.controllers import acceso_controller

router = APIRouter(prefix="/acceso", tags=["Acceso Edge"])


@router.post("/validar-qr", response_model=AccesoResponse)
async def validar_qr(req: ScanRequest, db: AsyncSession = Depends(get_db)):
    return await acceso_controller.validar_qr(req, db)
