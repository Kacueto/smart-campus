from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app import mqtt_client
from app.controllers.auth_controller       import router as auth_router
from app.controllers.horarios_controller   import router as horarios_router
from app.controllers.asistencia_controller import router as asistencia_router
from app.controllers.profesor_controller   import router as profesor_router
from app.controllers.reservas_controller   import router as reservas_router
from app.controllers.acceso_controller     import router as acceso_router
from app.controllers.admin_controller      import router as admin_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Ciclo de vida de la app: inicia y detiene el cliente MQTT al arrancar/apagar."""
    mqtt_client.start_mqtt()
    yield
    mqtt_client.stop_mqtt()


app = FastAPI(
    lifespan=lifespan,
    title="Smart Campus API",
    description="Sistema de control de acceso inteligente — Universidad del Norte (arquitectura MVC)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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


@app.get("/")
def root():
    """Health check básico de la API."""
    return {"status": "ok", "proyecto": "Smart Campus", "arquitectura": "MVC"}
