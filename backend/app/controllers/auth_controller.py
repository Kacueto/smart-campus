"""Controlador de autenticación: login, generación de QR, logout, registro de usuarios."""
from fastapi import APIRouter, HTTPException, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext

from app.database import get_db
from app.views.auth_view import LoginRequest, TokenResponse, QRTokenResponse, TokenData, UserRole
from app.auth.jwt_handler import create_access_token, create_qr_token, revoke_token
from app.auth.dependencies import get_current_user, require_role
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Autenticación"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Autentica al usuario con código universitario y contraseña. Retorna JWT de acceso y rol."""
    result = await db.execute(select(User).where(User.codigo == data.codigo))
    user = result.scalar_one_or_none()

    if not user or not pwd_context.verify(data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
        )

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    token = create_access_token(str(user.id), user.codigo, user.rol.value)
    return TokenResponse(
        access_token=token,
        role=user.rol.value,
        nombre=user.nombre,
    )


@router.post("/qr-token", response_model=QRTokenResponse)
async def generate_qr_token(aula_id: str, current_user: TokenData = Depends(get_current_user)):
    """Genera un short code QR de 12 chars para el aula indicada (TTL 30s)."""
    qr_token = create_qr_token(
        current_user.user_id,
        current_user.codigo,
        current_user.role,
        aula_id,
    )
    return QRTokenResponse(qr_token=qr_token, expires_in=30)


@router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_user)):
    """Revoca el token actual agregando su JTI a la blacklist de Redis."""
    revoke_token(current_user.jti)
    return {"message": "Sesión cerrada correctamente"}


@router.get("/me")
async def me(current_user: TokenData = Depends(get_current_user)):
    """Retorna los datos del usuario autenticado extraídos del token."""
    return current_user


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    codigo: str,
    nombre: str,
    email: str,
    password: str,
    rol: UserRole,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(UserRole.administrador)),
):
    """Solo administradores pueden crear usuarios."""
    result = await db.execute(select(User).where(User.codigo == codigo))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El código ya existe",
        )

    hashed_password = pwd_context.hash(password)
    new_user = User(
        codigo=codigo,
        nombre=nombre,
        email=email,
        password=hashed_password,
        rol=rol,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return {"message": "Usuario creado correctamente", "id": str(new_user.id)}
