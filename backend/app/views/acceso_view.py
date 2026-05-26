"""Vistas del endpoint de validación de QR usado por el edge node."""
from pydantic import BaseModel
from typing import Optional


class ScanRequest(BaseModel):
    qr_token: str
    aula_id: str
    ip_edge: Optional[str] = None


class AccesoResponse(BaseModel):
    acceso: str        # "permitido" | "denegado"
    motivo: str
    nombre: Optional[str] = None
    codigo: Optional[str] = None
    rol: Optional[str] = None
