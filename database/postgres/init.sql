CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('estudiante', 'docente', 'administrador');

CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    codigo      VARCHAR(20) UNIQUE NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(150) UNIQUE NOT NULL,
    password    VARCHAR(255) NOT NULL DEFAULT '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiGniMZZU7Zuu0eFdkST8H9B7WGO',
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
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aula_id     UUID NOT NULL REFERENCES aulas(id) ON DELETE CASCADE,
    docente_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    materia     VARCHAR(100) NOT NULL,
    dia_semana  SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    activo      BOOLEAN NOT NULL DEFAULT TRUE
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

CREATE INDEX idx_asistencia_user   ON asistencia(user_id);
CREATE INDEX idx_asistencia_aula   ON asistencia(aula_id);
CREATE INDEX idx_asistencia_ts     ON asistencia(timestamp_in);
CREATE INDEX idx_accesos_aula      ON accesos(aula_id);
CREATE INDEX idx_accesos_ts        ON accesos(timestamp);
CREATE INDEX idx_horarios_aula_dia ON horarios(aula_id, dia_semana);
CREATE INDEX idx_reservas_aula     ON reservas(aula_id);
CREATE INDEX idx_reservas_user     ON reservas(user_id);

INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('2024001', 'Ana García',      'ana.garcia@uninorte.edu.co',    'estudiante'),
    ('2024002', 'Luis Martínez',   'luis.martinez@uninorte.edu.co', 'estudiante'),
    ('DOC001',  'Prof. Rodríguez', 'rodriguez@uninorte.edu.co',     'docente'),
    ('ADM001',  'Admin Campus',    'admin@uninorte.edu.co',         'administrador')
ON CONFLICT DO NOTHING;

INSERT INTO aulas (codigo, nombre, edificio, capacidad) VALUES
    ('AULA-101', 'Aula 101',    'Edificio A', 40),
    ('AULA-202', 'Aula 202',    'Edificio B', 35),
    ('LAB-301',  'Lab Sistemas','Edificio C', 25)
ON CONFLICT DO NOTHING;
