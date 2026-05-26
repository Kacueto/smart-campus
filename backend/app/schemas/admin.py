from pydantic import BaseModel
from typing import Optional
from app.schemas.auth import UserRole


class CrearUsuarioRequest(BaseModel):
    codigo: str
    nombre: str
    email: str
    password: str
    rol: UserRole


class CrearAulaRequest(BaseModel):
    codigo: str
    nombre: str
    edificio: Optional[str] = None
    capacidad: int = 40
