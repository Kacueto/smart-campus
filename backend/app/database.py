import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# En Docker/EC2 la variable de entorno DATABASE_URL apunta a sc_postgres.
# En desarrollo local (sin la variable) usa localhost.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://scadmin:scpassword123@localhost:5432/smartcampus",
)

engine = create_async_engine(DATABASE_URL, echo=True)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    """Dependencia FastAPI que provee una sesión async de base de datos por request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
