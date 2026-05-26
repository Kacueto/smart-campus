from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, QRTokenResponse, TokenData, UserRole
from app.middleware.jwt_handler import create_access_token, create_qr_token, revoke_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def login(data: LoginRequest, db: AsyncSession) -> TokenResponse:
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
    return TokenResponse(access_token=token, role=user.rol.value, nombre=user.nombre)


async def generate_qr_token(aula_id: str, current_user: TokenData) -> QRTokenResponse:
    qr_token = create_qr_token(
        current_user.user_id,
        current_user.codigo,
        current_user.role,
        aula_id,
    )
    return QRTokenResponse(qr_token=qr_token, expires_in=30)


def logout(current_user: TokenData) -> dict:
    revoke_token(current_user.jti)
    return {"message": "Sesión cerrada correctamente"}


async def register(
    codigo: str, nombre: str, email: str, password: str, rol: UserRole, db: AsyncSession
) -> dict:
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
