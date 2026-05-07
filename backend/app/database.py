import os

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

# La URL se puede sobreescribir con la env var DATABASE_URL (asi funciona
# tanto en local con `localhost` como en docker-compose donde el host es
# el nombre del servicio: `postgres`).
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
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
