from pydantic import BaseModel
from datetime import datetime


class ReservaCreate(BaseModel):
    aula_id: str
    inicio: datetime
    duracion_horas: int
