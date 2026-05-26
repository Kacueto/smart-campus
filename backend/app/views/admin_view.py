"""Vistas del módulo de administración: CRUD de usuarios y aulas."""
from pydantic import BaseModel
from typing import Optional
from app.views.auth_view import UserRole


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
