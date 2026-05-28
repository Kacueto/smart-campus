import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s %(message)s",
)
from app.routers.auth import router as auth_router
from app.routers.horarios import router as horarios_router
from app.routers.asistencia import router as asistencia_router
from app.routers.profesor import router as profesor_router
from app.routers.reservas import router as reservas_router
from app.routers.acceso import router as acceso_router
from app.routers.admin import router as admin_router
from app.routers.ws import router as ws_router
from app import mqtt_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la app: inicia y detiene el cliente MQTT al arrancar/apagar."""
    mqtt_client.start_mqtt()
    yield
    mqtt_client.stop_mqtt()


app = FastAPI(
    lifespan=lifespan,
    title="Smart Campus API",
    description="Sistema de control de acceso inteligente — Universidad del Norte",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://lirio-smart-campus.duckdns.org",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(horarios_router)
app.include_router(asistencia_router)
app.include_router(profesor_router)
app.include_router(reservas_router)
app.include_router(acceso_router)
app.include_router(admin_router)
app.include_router(ws_router)

@app.get("/")
def root():
    """Health check básico de la API."""
    return {"status": "ok", "proyecto": "Smart Campus"}
