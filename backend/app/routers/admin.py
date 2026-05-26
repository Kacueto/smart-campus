from fastapi import APIRouter, Depends
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import TokenData, UserRole
from app.schemas.admin import CrearUsuarioRequest, CrearAulaRequest
from app.middleware.dependencies import require_role
from app.controllers import admin_controller

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats")
async def get_stats(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.get_stats(db)


@router.get("/usuarios")
async def listar_usuarios(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.listar_usuarios(db)


@router.post("/usuarios", status_code=http_status.HTTP_201_CREATED)
async def crear_usuario(
    req: CrearUsuarioRequest,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.crear_usuario(req, db)


@router.patch("/usuarios/{user_id}/toggle")
async def toggle_usuario(
    user_id: str,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.toggle_usuario(user_id, db)


@router.get("/aulas")
async def listar_aulas(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.listar_aulas(db)


@router.post("/aulas", status_code=http_status.HTTP_201_CREATED)
async def crear_aula(
    req: CrearAulaRequest,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.crear_aula(req, db)


@router.get("/accesos")
async def listar_accesos(
    limit: int = 50,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.listar_accesos(limit, db)


@router.get("/horarios")
async def listar_horarios(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.listar_horarios(db)


@router.get("/alertas")
async def get_alertas(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    return await admin_controller.get_alertas(db)
