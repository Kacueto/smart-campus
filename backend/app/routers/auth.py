from fastapi import APIRouter, Depends
from fastapi import status as http_status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.auth import LoginRequest, TokenResponse, QRTokenResponse, TokenData, UserRole
from app.middleware.dependencies import get_current_user, require_role
from app.controllers import auth_controller

router = APIRouter(prefix="/auth", tags=["Autenticación"])


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    return await auth_controller.login(data, db)


@router.post("/qr-token", response_model=QRTokenResponse)
async def generate_qr_token(
    aula_id: str,
    current_user: TokenData = Depends(get_current_user),
):
    return await auth_controller.generate_qr_token(aula_id, current_user)


@router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_user)):
    return auth_controller.logout(current_user)


@router.get("/me")
async def me(current_user: TokenData = Depends(get_current_user)):
    return current_user


@router.post("/register", status_code=http_status.HTTP_201_CREATED)
async def register(
    codigo: str,
    nombre: str,
    email: str,
    password: str,
    rol: UserRole,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(UserRole.administrador)),
):
    return await auth_controller.register(codigo, nombre, email, password, rol, db)
