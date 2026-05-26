from pydantic import BaseModel
from enum import Enum


class UserRole(str, Enum):
    estudiante    = "estudiante"
    docente       = "docente"
    administrador = "administrador"


class LoginRequest(BaseModel):
    codigo: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole
    nombre: str


class QRTokenResponse(BaseModel):
    qr_token: str
    expires_in: int = 30


class TokenData(BaseModel):
    user_id: str
    codigo: str
    role: UserRole
    jti: str
