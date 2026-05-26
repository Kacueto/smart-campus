"""Centraliza la configuración del backend leída desde variables de entorno.

Permite que el mismo código corra en desarrollo (defaults locales) y en Docker
(variables de entorno definidas en docker-compose.yml).
"""
import os
from pathlib import Path


class Settings:
    # Base de datos PostgreSQL
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://scadmin:scpassword123@localhost:5432/smartcampus",
    )
    DATABASE_ECHO: bool = os.getenv("DATABASE_ECHO", "true").lower() == "true"

    # Redis (blacklist JWT + short tokens QR + nonces anti-replay)
    REDIS_URL: str = os.getenv(
        "REDIS_URL",
        "redis://:redispassword123@localhost:6379/0",
    )

    # MQTT broker (publica resultados de acceso al edge)
    MQTT_HOST: str = os.getenv("MQTT_HOST", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", "1883"))
    MQTT_CLIENT_ID: str = os.getenv("MQTT_CLIENT_ID", "smart-campus-backend")

    # Certificados JWT RS256
    JWT_PRIVATE_KEY_PATH: Path = Path(
        os.getenv("JWT_PRIVATE_KEY_PATH", "../infra/certs/private.pem")
    )
    JWT_PUBLIC_KEY_PATH: Path = Path(
        os.getenv("JWT_PUBLIC_KEY_PATH", "../infra/certs/public.pem")
    )
    JWT_ALGORITHM: str = "RS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    QR_TOKEN_EXPIRE_SECONDS: int = int(os.getenv("QR_TOKEN_EXPIRE_SECONDS", "30"))

    # CORS
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")


settings = Settings()
