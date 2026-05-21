from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.api.horarios import router as horarios_router
from app.api.asistencia import router as asistencia_router
from app.api.profesor import router as profesor_router
from app.api.reservas import router as reservas_router
from app.api.acceso import router as acceso_router
from app.api.admin import router as admin_router
from app import mqtt_client


@asynccontextmanager
async def lifespan(app: FastAPI):
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

@app.get("/")
def root():
    return {"status": "ok", "proyecto": "Smart Campus"}
