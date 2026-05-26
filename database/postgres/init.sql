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

-- ═══════════════════════════════════════════════════════════════════════════════
--  SEED MASIVO — Smart Campus
--  Semestre 2026-1: 2026-03-02 (lunes) → 2026-07-31 (~22 semanas)
--  • 3 administradores
--  • 12 docentes
--  • 115 estudiantes (3 originales + 112 generados)
--  • 15 aulas (10 aulas + 5 labs)
--  • 33 horarios (2-3 materias por docente)
--  • Inscripciones: cada estudiante en 5-7 materias
--  • Asistencia: ~85% promedio, generada semana por semana hasta CURRENT_DATE
--
--  Password de TODOS los usuarios: 1234
-- ═══════════════════════════════════════════════════════════════════════════════

SELECT setseed(0.42);  -- reproducibilidad de los datos aleatorios

-- ── 1. Administradores ────────────────────────────────────────────────────────
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('ADM001', 'Admin Campus',     'admin@uninorte.edu.co',  'administrador'),
    ('ADM002', 'Camila Mendoza',   'admin2@uninorte.edu.co', 'administrador'),
    ('ADM003', 'Roberto Vargas',   'admin3@uninorte.edu.co', 'administrador')
ON CONFLICT DO NOTHING;

-- ── 2. Docentes (12) ──────────────────────────────────────────────────────────
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('DOC001', 'Prof. Rodríguez',        'rodriguez@uninorte.edu.co',     'docente'),
    ('DOC002', 'María González',         'gonzalez@uninorte.edu.co',      'docente'),
    ('DOC003', 'Juan Pérez',             'perez.juan@uninorte.edu.co',    'docente'),
    ('DOC004', 'Ana Martínez',           'martinez.ana@uninorte.edu.co',  'docente'),
    ('DOC005', 'Pedro Sánchez',          'sanchez.p@uninorte.edu.co',     'docente'),
    ('DOC006', 'Laura Ramírez',          'ramirez.l@uninorte.edu.co',     'docente'),
    ('DOC007', 'Diego Torres',           'torres.d@uninorte.edu.co',      'docente'),
    ('DOC008', 'Patricia Castro',        'castro.p@uninorte.edu.co',      'docente'),
    ('DOC009', 'Sergio Romero',          'romero.s@uninorte.edu.co',      'docente'),
    ('DOC010', 'Elena Vega',             'vega.e@uninorte.edu.co',        'docente'),
    ('DOC011', 'Mauricio Herrera',       'herrera.m@uninorte.edu.co',     'docente'),
    ('DOC012', 'Sofía Mendoza',          'mendoza.s@uninorte.edu.co',     'docente')
ON CONFLICT DO NOTHING;

-- ── 3. Estudiantes ────────────────────────────────────────────────────────────
-- 3a. Tres originales (compatibilidad con docs y pruebas anteriores)
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('2024001', 'Ana García',      'ana.garcia@uninorte.edu.co',    'estudiante'),
    ('2024002', 'Luis Martínez',   'luis.martinez@uninorte.edu.co', 'estudiante'),
    ('2024003', 'Carlos López',    'carlos.lopez@uninorte.edu.co',  'estudiante')
ON CONFLICT DO NOTHING;

-- 3b. 112 estudiantes generados (códigos 2026001 a 2026112) → total 115 estudiantes
DO $$
DECLARE
    nombres  TEXT[] := ARRAY[
        'Ana','Luis','Carlos','María','Juan','Sofía','Diego','Laura','Andrés','Camila',
        'Pedro','Lucía','Felipe','Valentina','Daniel','Isabella','Santiago','Mariana','Mateo','Gabriela',
        'Sebastián','Daniela','Nicolás','Paula','Jorge','Andrea','Tomás','Catalina','Alejandro','Manuela',
        'Esteban','Juliana','Cristian','Karen','David','Natalia','Hugo','Tatiana','Iván','Mónica',
        'Óscar','Beatriz','Raúl','Liliana','Emilio','Marcela','Eduardo','Verónica','Fernando','Adriana'
    ];
    apellidos TEXT[] := ARRAY[
        'García','Rodríguez','Martínez','López','Hernández','González','Pérez','Sánchez','Ramírez','Torres',
        'Flores','Rivera','Gómez','Díaz','Cruz','Morales','Reyes','Jiménez','Moreno','Romero',
        'Castro','Ortiz','Vargas','Mendoza','Silva','Castillo','Vega','Ríos','Álvarez','Núñez',
        'Acosta','Suárez','Peña','Salazar','Rincón','Pacheco','Cabrera','Quintero','Galindo','Restrepo'
    ];
    i INT;
    cod TEXT;
BEGIN
    PERFORM setseed(0.42);
    FOR i IN 1..112 LOOP
        cod := '2026' || lpad(i::text, 3, '0');
        INSERT INTO users (codigo, nombre, email, rol) VALUES (
            cod,
            nombres[1 + (random() * (array_length(nombres,1) - 1))::int] || ' ' ||
            apellidos[1 + (random() * (array_length(apellidos,1) - 1))::int] || ' ' ||
            apellidos[1 + (random() * (array_length(apellidos,1) - 1))::int],
            cod || '@uninorte.edu.co',
            'estudiante'
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ── 4. Aulas (15: 10 aulas + 5 labs) ──────────────────────────────────────────
INSERT INTO aulas (codigo, nombre, edificio, capacidad) VALUES
    ('AULA-101', 'Aula 101',     'Edificio A', 40),
    ('AULA-102', 'Aula 102',     'Edificio A', 40),
    ('AULA-103', 'Aula 103',     'Edificio A', 35),
    ('AULA-104', 'Aula 104',     'Edificio A', 35),
    ('AULA-201', 'Aula 201',     'Edificio B', 50),
    ('AULA-202', 'Aula 202',     'Edificio B', 35),
    ('AULA-203', 'Aula 203',     'Edificio B', 30),
    ('AULA-204', 'Aula 204',     'Edificio B', 30),
    ('AULA-205', 'Aula 205',     'Edificio B', 40),
    ('AULA-206', 'Aula 206',     'Edificio B', 40),
    ('LAB-301',  'Lab Sistemas', 'Edificio C', 25),
    ('LAB-302',  'Lab Redes',    'Edificio C', 25),
    ('LAB-303',  'Lab Hardware', 'Edificio C', 20),
    ('LAB-304',  'Lab Robótica', 'Edificio C', 20),
    ('LAB-305',  'Lab Multimedia','Edificio C', 30)
ON CONFLICT DO NOTHING;

-- ── 5. Horarios (33) ──────────────────────────────────────────────────────────
-- Período: 2026-03-02 (lunes) a 2026-07-31. dia_semana: 1=lunes ... 5=viernes.
INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, m.materia, m.dia, m.hi::time, m.hf::time, DATE '2026-03-02', DATE '2026-07-31'
FROM (VALUES
    -- DOC001 — Prof. Rodríguez (6 materias, mantiene las originales)
    ('AULA-101','DOC001','Arquitectura de Software',    1, '08:00', '10:00'),
    ('AULA-101','DOC001','Redes y Comunicaciones',      2, '08:00', '10:00'),
    ('LAB-301', 'DOC001','Sistemas Ciberfísicos',       2, '10:00', '12:00'),
    ('AULA-202','DOC001','Bases de Datos Avanzadas',    2, '12:00', '14:00'),
    ('AULA-202','DOC001','Gestión Integrada en TI',     3, '14:00', '16:00'),
    ('AULA-101','DOC001','Criptografía',                5, '07:00', '09:00'),
    -- DOC002 — María González (matemáticas)
    ('AULA-102','DOC002','Cálculo I',                   1, '08:00', '10:00'),
    ('AULA-102','DOC002','Cálculo II',                  3, '08:00', '10:00'),
    ('AULA-103','DOC002','Álgebra Lineal',              5, '10:00', '12:00'),
    -- DOC003 — Juan Pérez (programación)
    ('AULA-103','DOC003','Programación I',              1, '10:00', '12:00'),
    ('LAB-302', 'DOC003','Programación II',             3, '10:00', '12:00'),
    ('LAB-302', 'DOC003','Estructuras de Datos',        4, '08:00', '10:00'),
    -- DOC004 — Ana Martínez (inglés)
    ('AULA-104','DOC004','Inglés I',                    1, '14:00', '16:00'),
    ('AULA-104','DOC004','Inglés II',                   3, '14:00', '16:00'),
    ('AULA-104','DOC004','Inglés III',                  5, '14:00', '16:00'),
    -- DOC005 — Pedro Sánchez (física)
    ('AULA-201','DOC005','Física I',                    2, '14:00', '16:00'),
    ('AULA-201','DOC005','Física II',                   4, '14:00', '16:00'),
    -- DOC006 — Laura Ramírez (IA y algoritmos)
    ('LAB-303', 'DOC006','Algoritmos',                  1, '10:00', '12:00'),
    ('LAB-303', 'DOC006','Inteligencia Artificial',     4, '10:00', '12:00'),
    ('LAB-303', 'DOC006','Machine Learning',            4, '14:00', '16:00'),
    -- DOC007 — Diego Torres (SO e IoT)
    ('AULA-203','DOC007','Sistemas Operativos',         2, '16:00', '18:00'),
    ('LAB-304', 'DOC007','IoT y Sistemas Embebidos',    5, '08:00', '10:00'),
    -- DOC008 — Patricia Castro (probabilidad y operaciones)
    ('AULA-204','DOC008','Probabilidad y Estadística',  1, '12:00', '14:00'),
    ('AULA-204','DOC008','Investigación de Operaciones',3, '12:00', '14:00'),
    -- DOC009 — Sergio Romero (diseño y desarrollo)
    ('AULA-205','DOC009','Diseño de Software',          2, '14:00', '16:00'),
    ('LAB-305', 'DOC009','Desarrollo Web',              4, '12:00', '14:00'),
    -- DOC010 — Elena Vega (humanidades)
    ('AULA-206','DOC010','Ética Profesional',           3, '16:00', '18:00'),
    ('AULA-206','DOC010','Constitución y Cívica',       5, '16:00', '18:00'),
    -- DOC011 — Mauricio Herrera (BD y seguridad)
    ('AULA-201','DOC011','Bases de Datos',              1, '16:00', '18:00'),
    ('AULA-202','DOC011','Seguridad Informática',       4, '16:00', '18:00'),
    -- DOC012 — Sofía Mendoza (comunicación)
    ('AULA-205','DOC012','Comunicación Oral y Escrita', 2, '10:00', '12:00'),
    ('AULA-206','DOC012','Liderazgo y Trabajo en Equipo', 4, '10:00', '12:00'),
    ('AULA-203','DOC012','Pensamiento Crítico',         5, '12:00', '14:00')
) AS m(aula_cod, doc_cod, materia, dia, hi, hf)
JOIN aulas a ON a.codigo = m.aula_cod
JOIN users u ON u.codigo = m.doc_cod;

-- ── 6. Inscripciones (cada estudiante en 5-7 materias aleatorias) ─────────────
DO $$
DECLARE
    est RECORD;
    num_materias INT;
BEGIN
    PERFORM setseed(0.42);
    FOR est IN SELECT id, codigo FROM users WHERE rol = 'estudiante' ORDER BY codigo LOOP
        num_materias := 5 + (random() * 2)::int;  -- 5, 6 o 7
        INSERT INTO inscripciones (user_id, horario_id)
        SELECT est.id, h.id
        FROM horarios h
        WHERE h.activo = true
        ORDER BY random()
        LIMIT num_materias
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- ── 7. Asistencia (4 meses, ~85% promedio, con jitter de llegada 0-15 min) ────
-- Para cada inscripción, genera UNA sesión por semana desde fecha_inicio del
-- horario hasta CURRENT_DATE. Filtra con random() < 0.85 para simular faltas.
INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT
    i.user_id,
    h.aula_id,
    h.id,
    (h.fecha_inicio
        + ((h.dia_semana - EXTRACT(ISODOW FROM h.fecha_inicio)::int + 7) % 7) * INTERVAL '1 day'
        + n * INTERVAL '7 days'
    )::date
    + h.hora_inicio
    + (random() * INTERVAL '15 minutes'),
    'qr',
    true
FROM inscripciones i
JOIN horarios h ON i.horario_id = h.id
CROSS JOIN generate_series(0, 21) AS n
WHERE h.activo = true
  AND (h.fecha_inicio
        + ((h.dia_semana - EXTRACT(ISODOW FROM h.fecha_inicio)::int + 7) % 7) * INTERVAL '1 day'
        + n * INTERVAL '7 days'
      )::date BETWEEN h.fecha_inicio AND CURRENT_DATE
  AND random() < 0.85;
