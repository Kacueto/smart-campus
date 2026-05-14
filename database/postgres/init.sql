CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('estudiante', 'docente', 'administrador');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(20) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL DEFAULT '$2b$12$BFsM2lV754AFWCt5cVEsluYxQI1b2n9lHNK6yh9L1Zdsc9UDAEhP.',
    rol         user_role NOT NULL DEFAULT 'estudiante',
    activo      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS aulas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(20) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    edificio    VARCHAR(50),
    capacidad   INTEGER DEFAULT 40,
    activa      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horarios (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aula_id      UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    docente_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    materia      VARCHAR(100) NOT NULL,
    dia_semana   SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio  TIME NOT NULL,
    hora_fin     TIME NOT NULL,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin    DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '6 months'),
    activo       BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS inscripciones (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    horario_id UUID NOT NULL REFERENCES horarios(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, horario_id)
);

CREATE TABLE IF NOT EXISTS reservas (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id),
    aula_id     UUID NOT NULL REFERENCES aulas(id),
    inicio      TIMESTAMP WITH TIME ZONE NOT NULL,
    fin         TIMESTAMP WITH TIME ZONE NOT NULL,
    estado      VARCHAR(20) DEFAULT 'activa',
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS asistencia (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aula_id         UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    horario_id      UUID REFERENCES horarios(id),
    timestamp_in    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metodo          VARCHAR(30) DEFAULT 'qr',
    valido          BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS accesos (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id),
    aula_id         UUID NOT NULL REFERENCES aulas(id),
    timestamp       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    evento          VARCHAR(30) NOT NULL,
    token_nonce     VARCHAR(64),
    ip_edge         INET,
    detalle         JSONB
);

CREATE TABLE IF NOT EXISTS tokens_revocados (
    jti         VARCHAR(64) PRIMARY KEY,
    user_id     UUID REFERENCES users(id),
    revocado_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expira_at   TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_asistencia_user   ON asistencia(user_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_aula   ON asistencia(aula_id);
CREATE INDEX IF NOT EXISTS idx_asistencia_ts     ON asistencia(timestamp_in);
CREATE INDEX IF NOT EXISTS idx_accesos_aula      ON accesos(aula_id);
CREATE INDEX IF NOT EXISTS idx_accesos_ts        ON accesos(timestamp);
CREATE INDEX IF NOT EXISTS idx_horarios_aula_dia ON horarios(aula_id, dia_semana);
CREATE INDEX IF NOT EXISTS idx_reservas_aula     ON reservas(aula_id);
CREATE INDEX IF NOT EXISTS idx_reservas_user     ON reservas(user_id);

-- Seed users (password = 1234)
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('2024001', 'Ana García',      'ana.garcia@uninorte.edu.co',    'estudiante'),
    ('2024002', 'Luis Martínez',   'luis.martinez@uninorte.edu.co', 'estudiante'),
    ('2024003', 'Carlos López',    'carlos.lopez@uninorte.edu.co',  'estudiante'),
    ('DOC001',  'Prof. Rodríguez', 'rodriguez@uninorte.edu.co',     'docente'),
    ('ADM001',  'Admin Campus',    'admin@uninorte.edu.co',         'administrador')
ON CONFLICT DO NOTHING;

-- Seed aulas
INSERT INTO aulas (codigo, nombre, edificio, capacidad) VALUES
    ('AULA-101', 'Aula 101',    'Edificio A', 40),
    ('AULA-202', 'Aula 202',    'Edificio B', 35),
    ('LAB-301',  'Lab Sistemas','Edificio C', 25)
ON CONFLICT DO NOTHING;

-- Seed horarios del Prof. Rodríguez
INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Arquitectura de Software', 1, '08:00', '10:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='AULA-101' AND u.codigo='DOC001';

INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Redes y Comunicaciones', 2, '08:00', '10:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='AULA-101' AND u.codigo='DOC001';

INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Sistemas Ciberfísicos', 2, '10:00', '12:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='LAB-301' AND u.codigo='DOC001';

INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Bases de Datos Avanzadas', 2, '12:00', '14:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='AULA-202' AND u.codigo='DOC001';

INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Gestión Integrada en TI', 3, '14:00', '16:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='AULA-202' AND u.codigo='DOC001';

INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, 'Criptografía', 5, '07:00', '09:00', '2026-01-12', '2026-06-30'
FROM aulas a, users u WHERE a.codigo='AULA-101' AND u.codigo='DOC001';

-- Inscribir todos los estudiantes en todos los horarios
INSERT INTO inscripciones (user_id, horario_id)
SELECT u.id, h.id FROM users u CROSS JOIN horarios h
WHERE u.codigo IN ('2024001', '2024002', '2024003')
ON CONFLICT DO NOTHING;

-- Seed asistencia mock — últimas 3 semanas
-- Semana -3: todos asisten a las 6 materias
INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '22 days' + INTERVAL '8 hours 15 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Arquitectura de Software'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '21 days' + INTERVAL '8 hours 6 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Redes y Comunicaciones'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '21 days' + INTERVAL '10 hours 3 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='LAB-301' AND h.materia='Sistemas Ciberfísicos'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '21 days' + INTERVAL '12 hours 9 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-202' AND h.materia='Bases de Datos Avanzadas'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '20 days' + INTERVAL '14 hours 4 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-202' AND h.materia='Gestión Integrada en TI'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '18 days' + INTERVAL '7 hours 11 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Criptografía'
ON CONFLICT DO NOTHING;

-- Semana -2: todos asisten (excepto Carlos que falta a Criptografía)
INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '15 days' + INTERVAL '8 hours 18 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Arquitectura de Software'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '14 days' + INTERVAL '8 hours 2 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Redes y Comunicaciones'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '13 days' + INTERVAL '14 hours 7 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-202' AND h.materia='Gestión Integrada en TI'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '11 days' + INTERVAL '7 hours 5 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002') AND a.codigo='AULA-101' AND h.materia='Criptografía'
ON CONFLICT DO NOTHING;

-- Semana -1: Ana y Luis asisten a 2 clases, Carlos a 1
INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '8 days' + INTERVAL '8 hours 10 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002','2024003') AND a.codigo='AULA-101' AND h.materia='Arquitectura de Software'
ON CONFLICT DO NOTHING;

INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT u.id, a.id, h.id, NOW() - INTERVAL '7 days' + INTERVAL '10 hours 14 minutes', 'qr', true
FROM users u, aulas a, horarios h
WHERE u.codigo IN ('2024001','2024002') AND a.codigo='LAB-301' AND h.materia='Sistemas Ciberfísicos'
ON CONFLICT DO NOTHING;
