from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.router import router as auth_router
from app.api.horarios import router as horarios_router
from app.api.asistencia import router as asistencia_router
from app.api.profesor import router as profesor_router
from app.api.reservas import router as reservas_router

app = FastAPI(
    title="Smart Campus API",
    description="Sistema de control de acceso inteligente — Universidad del Norte",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(horarios_router)
app.include_router(asistencia_router)
app.include_router(profesor_router)
app.include_router(reservas_router)

@app.get("/")
def root():
    return {"status": "ok", "proyecto": "Smart Campus"}
