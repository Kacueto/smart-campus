from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from uuid import UUID
from passlib.context import CryptContext
from app.schemas.admin import CrearUsuarioRequest, CrearAulaRequest

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

DIAS = {1: "Lunes", 2: "Martes", 3: "Miércoles",
        4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo"}


async def get_stats(db: AsyncSession) -> dict:
    usuarios = await db.execute(text("""
        SELECT rol, COUNT(*) as total, COUNT(*) FILTER (WHERE activo) as activos
        FROM users GROUP BY rol
    """))
    usuarios_por_rol = {
        row.rol: {"total": row.total, "activos": row.activos}
        for row in usuarios.fetchall()
    }

    aulas = await db.execute(text("SELECT COUNT(*) FROM aulas WHERE activa = true"))
    total_aulas = aulas.scalar()

    accesos = await db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE evento = 'permitido') as permitidos,
            COUNT(*) FILTER (WHERE evento = 'denegado')  as denegados
        FROM accesos
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
    """))
    acc = accesos.fetchone()

    asistencia = await db.execute(text(
        "SELECT COUNT(*) FROM asistencia WHERE valido = true"
    ))
    total_asistencias = asistencia.scalar()

    return {
        "usuarios_por_rol":       usuarios_por_rol,
        "total_aulas":            total_aulas,
        "accesos_hoy_permitidos": acc.permitidos or 0,
        "accesos_hoy_denegados":  acc.denegados or 0,
        "total_asistencias":      total_asistencias,
    }


async def listar_usuarios(db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT id, codigo, nombre, email, rol, activo, created_at
        FROM users
        ORDER BY rol, nombre
    """))
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
        for r in result.fetchall()
    ]


async def crear_usuario(req: CrearUsuarioRequest, db: AsyncSession) -> dict:
    exists = await db.execute(
        text("SELECT id FROM users WHERE codigo = :codigo OR email = :email"),
        {"codigo": req.codigo, "email": req.email},
    )
    if exists.fetchone():
        raise HTTPException(status_code=400, detail="El código o email ya existe")

    hashed = pwd_context.hash(req.password)
    result = await db.execute(text("""
        INSERT INTO users (codigo, nombre, email, password, rol)
        VALUES (:codigo, :nombre, :email, :password, :rol)
        RETURNING id
    """), {
        "codigo":   req.codigo,
        "nombre":   req.nombre,
        "email":    req.email,
        "password": hashed,
        "rol":      req.rol.value,
    })
    await db.commit()
    return {"message": "Usuario creado", "id": str(result.fetchone().id)}


async def toggle_usuario(user_id: str, db: AsyncSession) -> dict:
    result = await db.execute(
        text("UPDATE users SET activo = NOT activo WHERE id = :id RETURNING activo"),
        {"id": UUID(user_id)},
    )
    row = result.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    await db.commit()
    return {"activo": row.activo}


async def listar_aulas(db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            a.id, a.codigo, a.nombre, a.edificio, a.capacidad, a.activa,
            COUNT(DISTINCT h.id) as total_horarios
        FROM aulas a
        LEFT JOIN horarios h ON h.aula_id = a.id AND h.activo = true
        GROUP BY a.id
        ORDER BY a.edificio, a.nombre
    """))
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
        for r in result.fetchall()
    ]


async def crear_aula(req: CrearAulaRequest, db: AsyncSession) -> dict:
    exists = await db.execute(
        text("SELECT id FROM aulas WHERE codigo = :codigo"),
        {"codigo": req.codigo},
    )
    if exists.fetchone():
        raise HTTPException(status_code=400, detail="El código de aula ya existe")

    result = await db.execute(text("""
        INSERT INTO aulas (codigo, nombre, edificio, capacidad)
        VALUES (:codigo, :nombre, :edificio, :capacidad)
        RETURNING id
    """), {
        "codigo":    req.codigo,
        "nombre":    req.nombre,
        "edificio":  req.edificio,
        "capacidad": req.capacidad,
    })
    await db.commit()
    return {"message": "Aula creada", "id": str(result.fetchone().id)}


async def listar_accesos(limit: int, db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            ac.id,
            ac.timestamp,
            ac.evento,
            ac.ip_edge,
            ac.detalle,
            u.nombre  as user_nombre,
            u.codigo  as user_codigo,
            u.rol     as user_rol,
            al.nombre as aula_nombre,
            al.codigo as aula_codigo
        FROM accesos ac
        LEFT JOIN users u  ON ac.user_id = u.id
        JOIN  aulas  al ON ac.aula_id = al.id
        ORDER BY ac.timestamp DESC
        LIMIT :limit
    """), {"limit": limit})

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
        for r in result.fetchall()
    ]


async def listar_horarios(db: AsyncSession) -> list:
    result = await db.execute(text("""
        SELECT
            h.id,
            h.materia,
            h.dia_semana,
            h.hora_inicio::text,
            h.hora_fin::text,
            h.activo,
            u.nombre as docente,
            u.codigo as docente_codigo,
            a.nombre as aula,
            a.codigo as aula_codigo,
            a.edificio,
            COUNT(i.user_id) as total_inscritos
        FROM horarios h
        JOIN users u ON h.docente_id = u.id
        JOIN aulas a ON h.aula_id    = a.id
        LEFT JOIN inscripciones i ON i.horario_id = h.id
        GROUP BY h.id, u.id, a.id
        ORDER BY h.dia_semana, h.hora_inicio
    """))
    return [
        {
            "id":              str(r.id),
            "materia":         r.materia,
            "dia":             DIAS.get(r.dia_semana, ""),
            "dia_semana":      r.dia_semana,
            "horario":         f"{r.hora_inicio[:5]} – {r.hora_fin[:5]}",
            "activo":          r.activo,
            "docente":         r.docente,
            "docente_codigo":  r.docente_codigo,
            "aula":            f"{r.edificio} – {r.aula}" if r.edificio else r.aula,
            "aula_codigo":     r.aula_codigo,
            "total_inscritos": r.total_inscritos,
        }
        for r in result.fetchall()
    ]


async def get_alertas(db: AsyncSession) -> list:
    alertas = []

    # 1. Intentos de replay (nonce ya usado)
    r1 = await db.execute(text("""
        SELECT
            ac.timestamp,
            u.nombre  AS user_nombre,
            u.codigo  AS user_codigo,
            al.codigo AS aula_codigo,
            ac.ip_edge
        FROM accesos ac
        LEFT JOIN users u ON ac.user_id = u.id
        JOIN  aulas al ON ac.aula_id = al.id
        WHERE ac.detalle->>'motivo' = 'token_invalido_o_expirado'
          AND ac.timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY ac.timestamp DESC
        LIMIT 20
    """))
    for r in r1.fetchall():
        alertas.append({
            "tipo":        "replay_attempt",
            "nivel":       "alto",
            "descripcion": f"Token inválido/expirado — posible replay",
            "usuario":     r.user_nombre or "Desconocido",
            "codigo":      r.user_codigo or "—",
            "aula":        r.aula_codigo,
            "timestamp":   r.timestamp.strftime("%d/%m %H:%M:%S"),
        })

    # 2. Mismo usuario en dos aulas distintas en menos de 5 minutos
    r2 = await db.execute(text("""
        SELECT
            a1.user_id,
            u.nombre  AS user_nombre,
            u.codigo  AS user_codigo,
            al1.codigo AS aula1,
            al2.codigo AS aula2,
            a1.timestamp AS ts1,
            a2.timestamp AS ts2
        FROM accesos a1
        JOIN accesos a2 ON a1.user_id = a2.user_id
            AND a1.aula_id != a2.aula_id
            AND ABS(EXTRACT(EPOCH FROM (a1.timestamp - a2.timestamp))) < 300
            AND a1.evento = 'permitido' AND a2.evento = 'permitido'
            AND a1.id < a2.id
        JOIN users u   ON a1.user_id = u.id
        JOIN aulas al1 ON a1.aula_id = al1.id
        JOIN aulas al2 ON a2.aula_id = al2.id
        WHERE a1.timestamp >= NOW() - INTERVAL '24 hours'
        ORDER BY a1.timestamp DESC
        LIMIT 10
    """))
    for r in r2.fetchall():
        alertas.append({
            "tipo":        "impossible_location",
            "nivel":       "critico",
            "descripcion": f"Acceso en dos aulas en < 5 min: {r.aula1} y {r.aula2}",
            "usuario":     r.user_nombre,
            "codigo":      r.user_codigo,
            "aula":        f"{r.aula1} / {r.aula2}",
            "timestamp":   r.ts1.strftime("%d/%m %H:%M:%S"),
        })

    # 3. Más de 10 escaneos denegados desde el mismo nodo en 1 minuto
    r3 = await db.execute(text("""
        SELECT
            ac.ip_edge,
            al.codigo AS aula_codigo,
            COUNT(*) AS intentos,
            MIN(ac.timestamp) AS desde
        FROM accesos ac
        JOIN aulas al ON ac.aula_id = al.id
        WHERE ac.evento = 'denegado'
          AND ac.timestamp >= NOW() - INTERVAL '24 hours'
          AND ac.ip_edge IS NOT NULL
        GROUP BY ac.ip_edge, al.codigo, date_trunc('minute', ac.timestamp)
        HAVING COUNT(*) > 10
        ORDER BY intentos DESC
        LIMIT 10
    """))
    for r in r3.fetchall():
        alertas.append({
            "tipo":        "brute_force",
            "nivel":       "critico",
            "descripcion": f"{r.intentos} denegados en 1 min desde {r.ip_edge}",
            "usuario":     "—",
            "codigo":      "—",
            "aula":        r.aula_codigo,
            "timestamp":   r.desde.strftime("%d/%m %H:%M:%S"),
        })

    alertas.sort(key=lambda a: a["timestamp"], reverse=True)
    return alertas
