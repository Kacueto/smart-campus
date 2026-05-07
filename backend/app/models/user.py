import uuid
import enum
from sqlalchemy import Column, String, Boolean, Enum as SAEnum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.database import Base

class UserRole(str, enum.Enum):
    estudiante    = "estudiante"
    docente       = "docente"
    administrador = "administrador"

class User(Base):
    __tablename__ = "users"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    codigo     = Column(String(20), unique=True, nullable=False)
    nombre     = Column(String(100), nullable=False)
    email      = Column(String(150), unique=True, nullable=False)
    password   = Column(String(255), nullable=False)
    rol        = Column(SAEnum(UserRole, name="user_role", create_type=False), nullable=False, default=UserRole.estudiante)
    activo     = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
