"""Controlador del panel admin: stats globales, CRUD de usuarios/aulas, listado de accesos y horarios."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from passlib.context import CryptContext

from app.database import get_db
from app.auth.dependencies import require_role
from app.views.auth_view import TokenData, UserRole
from app.views.admin_view import CrearUsuarioRequest, CrearAulaRequest
from app.models import acceso_model, asistencia_model, aula_model, horario_model, user_model

router = APIRouter(prefix="/admin", tags=["Admin"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles",
         4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


# ── Stats globales ────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    """Retorna métricas agregadas (usuarios por rol, aulas, accesos 24h, asistencias totales)."""
    usuarios = await user_model.stats_usuarios_por_rol(db)
    usuarios_por_rol = {
        row.rol: {"total": row.total, "activos": row.activos}
        for row in usuarios
    }

    total_aulas = await aula_model.contar_aulas_activas(db)
    acc = await acceso_model.contar_accesos_ultimas_24h(db)
    total_asistencias = await asistencia_model.total_asistencias_validas(db)

    return {
        "usuarios_por_rol":        usuarios_por_rol,
        "total_aulas":             total_aulas,
        "accesos_hoy_permitidos":  acc.permitidos or 0,
        "accesos_hoy_denegados":   acc.denegados or 0,
        "total_asistencias":       total_asistencias,
    }


# ── Usuarios ──────────────────────────────────────────────────────────────────

@router.get("/usuarios")
async def listar_usuarios(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    rows = await user_model.listar_usuarios(db)
    return [
        {
            "id":         str(r.id),
            "codigo":     r.codigo,
            "nombre":     r.nombre,
            "email":      r.email,
            "rol":        r.rol,
            "activo":     r.activo,
            "created_at": r.created_at.strftime("%Y-%m-%d"),
        }
        for r in rows
    ]


@router.post("/usuarios", status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    req: CrearUsuarioRequest,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    if await user_model.existe_usuario(db, req.codigo, req.email):
        raise HTTPException(status_code=400, detail="El código o email ya existe")

    hashed = pwd_context.hash(req.password)
    new_id = await user_model.crear_usuario(
        db,
        codigo=req.codigo,
        nombre=req.nombre,
        email=req.email,
        password_hash=hashed,
        rol=req.rol.value,
    )
    return {"message": "Usuario creado", "id": new_id}


@router.patch("/usuarios/{user_id}/toggle")
async def toggle_usuario(
    user_id: str,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    row = await user_model.toggle_activo(db, user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"activo": row.activo}


# ── Aulas ─────────────────────────────────────────────────────────────────────

@router.get("/aulas")
async def listar_aulas(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    rows = await aula_model.listar_aulas_admin(db)
    return [
        {
            "id":             str(r.id),
            "codigo":         r.codigo,
            "nombre":         r.nombre,
            "edificio":       r.edificio or "",
            "capacidad":      r.capacidad,
            "activa":         r.activa,
            "total_horarios": r.total_horarios,
        }
        for r in rows
    ]


@router.post("/aulas", status_code=status.HTTP_201_CREATED)
async def crear_aula(
    req: CrearAulaRequest,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    if await aula_model.existe_aula_por_codigo(db, req.codigo):
        raise HTTPException(status_code=400, detail="El código de aula ya existe")

    new_id = await aula_model.crear_aula(
        db,
        codigo=req.codigo,
        nombre=req.nombre,
        edificio=req.edificio,
        capacidad=req.capacidad,
    )
    return {"message": "Aula creada", "id": new_id}


# ── Accesos recientes ─────────────────────────────────────────────────────────

@router.get("/accesos")
async def listar_accesos(
    limit: int = 50,
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    rows = await acceso_model.listar_accesos_recientes(db, limit)
    return [
        {
            "id":          str(r.id),
            "timestamp":   r.timestamp.strftime("%d/%m %H:%M:%S"),
            "evento":      r.evento,
            "ip_edge":     str(r.ip_edge) if r.ip_edge else None,
            "motivo":      (r.detalle or {}).get("motivo", "") if r.detalle else "",
            "user_nombre": r.user_nombre or "Desconocido",
            "user_codigo": r.user_codigo or "—",
            "user_rol":    r.user_rol or "—",
            "aula_nombre": r.aula_nombre,
            "aula_codigo": r.aula_codigo,
        }
        for r in rows
    ]


# ── Horarios ──────────────────────────────────────────────────────────────────

@router.get("/horarios")
async def listar_horarios(
    _: TokenData = Depends(require_role(UserRole.administrador)),
    db: AsyncSession = Depends(get_db),
):
    rows = await horario_model.listar_horarios_admin(db)
    return [
        {
            "id":              str(r.id),
            "materia":         r.materia,
            "dia":             _DIAS.get(r.dia_semana, ""),
            "dia_semana":      r.dia_semana,
            "horario":         f"{r.hora_inicio[:5]} – {r.hora_fin[:5]}",
            "activo":          r.activo,
            "docente":         r.docente,
            "docente_codigo":  r.docente_codigo,
            "aula":            f"{r.edificio} – {r.aula}" if r.edificio else r.aula,
            "aula_codigo":     r.aula_codigo,
            "total_inscritos": r.total_inscritos,
        }
        for r in rows
    ]
