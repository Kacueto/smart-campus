-- ============================================================================
-- seed_expanded.sql — Seed ampliada para Smart Campus
-- ----------------------------------------------------------------------------
-- Aplicar DESPUÉS de init.sql. Idempotente para usuarios/aulas/horarios/
-- inscripciones (ON CONFLICT DO NOTHING). NO idempotente para asistencia:
-- no relancarlo dos veces sobre la misma base o duplicará registros.
--
-- Cómo correrlo:
--   docker exec -i sc_postgres psql -U scadmin -d smartcampus \
--     < database/postgres/seed_expanded.sql
--
-- Determinismo: usa setseed(0.42) para que cada corrida produzca exactamente
-- las mismas inscripciones y asistencias.
--
-- Contenido objetivo (aprox):
--   3 admins · 12 docentes · 115 estudiantes · 15 aulas · 33 horarios
--   ~699 inscripciones (5-7 por estudiante)
--   ~7,400 asistencias (13 semanas, ~82% asistencia, jitter 0-15 min)
-- ============================================================================

BEGIN;

SELECT setseed(0.42);

-- ============================================================================
-- 1) USUARIOS
-- ============================================================================

-- 1a) Administradores extra (init.sql ya creó ADM001)
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('ADM002', 'Admin Sistemas',  'admin.sistemas@uninorte.edu.co',  'administrador'),
    ('ADM003', 'Admin Académico', 'admin.academico@uninorte.edu.co', 'administrador')
ON CONFLICT (codigo) DO NOTHING;

-- 1b) Docentes extra (init.sql ya creó DOC001 Prof. Rodríguez)
INSERT INTO users (codigo, nombre, email, rol) VALUES
    ('DOC002', 'Prof. Gómez',    'gomez@uninorte.edu.co',    'docente'),
    ('DOC003', 'Prof. Pérez',    'perez@uninorte.edu.co',    'docente'),
    ('DOC004', 'Prof. Sánchez',  'sanchez@uninorte.edu.co',  'docente'),
    ('DOC005', 'Prof. Ramírez',  'ramirez@uninorte.edu.co',  'docente'),
    ('DOC006', 'Prof. Torres',   'torres@uninorte.edu.co',   'docente'),
    ('DOC007', 'Prof. Castro',   'castro@uninorte.edu.co',   'docente'),
    ('DOC008', 'Prof. Vargas',   'vargas@uninorte.edu.co',   'docente'),
    ('DOC009', 'Prof. Mendoza',  'mendoza@uninorte.edu.co',  'docente'),
    ('DOC010', 'Prof. Jiménez',  'jimenez@uninorte.edu.co',  'docente'),
    ('DOC011', 'Prof. Ortiz',    'ortiz@uninorte.edu.co',    'docente'),
    ('DOC012', 'Prof. Reyes',    'reyes@uninorte.edu.co',    'docente')
ON CONFLICT (codigo) DO NOTHING;

-- 1c) Estudiantes extra: 112 nuevos con código 2026001..2026112
--     (los 3 originales 2024001-003 ya están en init.sql)
INSERT INTO users (codigo, nombre, email, rol)
SELECT
    '2026' || LPAD(g::text, 3, '0'),
    'Estudiante ' || LPAD(g::text, 3, '0'),
    'estudiante' || LPAD(g::text, 3, '0') || '@uninorte.edu.co',
    'estudiante'
FROM generate_series(1, 112) AS g
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 2) AULAS — total objetivo 15 (10 + 5 labs)
--    init.sql creó: AULA-101, AULA-202, LAB-301
-- ============================================================================

INSERT INTO aulas (codigo, nombre, edificio, capacidad) VALUES
    -- Edificio A: AULA-101..105 (101 ya existe)
    ('AULA-102', 'Aula 102', 'Edificio A', 40),
    ('AULA-103', 'Aula 103', 'Edificio A', 40),
    ('AULA-104', 'Aula 104', 'Edificio A', 35),
    ('AULA-105', 'Aula 105', 'Edificio A', 30),
    -- Edificio B: AULA-201..206 (202 ya existe)
    ('AULA-201', 'Aula 201', 'Edificio B', 40),
    ('AULA-203', 'Aula 203', 'Edificio B', 35),
    ('AULA-204', 'Aula 204', 'Edificio B', 35),
    ('AULA-205', 'Aula 205', 'Edificio B', 30),
    ('AULA-206', 'Aula 206', 'Edificio B', 30),
    -- Labs: LAB-301..305 (301 ya existe)
    ('LAB-302',  'Lab Redes',         'Edificio C', 25),
    ('LAB-303',  'Lab Hardware',      'Edificio C', 20),
    ('LAB-304',  'Lab Robótica',      'Edificio C', 20),
    ('LAB-305',  'Lab IoT',           'Edificio C', 20)
ON CONFLICT (codigo) DO NOTHING;

-- ============================================================================
-- 3) HORARIOS — 27 nuevos para alcanzar 33 totales
--    (init.sql ya creó 6 horarios para DOC001 Prof. Rodríguez)
--    Distribución: 5 docentes × 3 materias + 6 docentes × 2 materias = 27
--    dia_semana: 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie
--    Sin conflictos de aula/hora con horarios existentes ni entre sí.
-- ============================================================================

-- Helper macro vía VALUES: (codigo_docente, codigo_aula, materia, dia, hi, hf)
INSERT INTO horarios (aula_id, docente_id, materia, dia_semana, hora_inicio, hora_fin, fecha_inicio, fecha_fin)
SELECT a.id, u.id, v.materia, v.dia_semana, v.hora_inicio::time, v.hora_fin::time,
       DATE '2026-01-12', DATE '2026-06-30'
FROM (VALUES
    -- DOC002 Prof. Gómez — 3 materias
    ('DOC002', 'LAB-302',  'Inteligencia Artificial',     1, '10:00', '12:00'),
    ('DOC002', 'AULA-102', 'Algoritmos',                  2, '14:00', '16:00'),
    ('DOC002', 'AULA-103', 'Estructuras de Datos',        4, '08:00', '10:00'),
    -- DOC003 Prof. Pérez — 3 materias
    ('DOC003', 'AULA-104', 'Cálculo I',                   1, '14:00', '16:00'),
    ('DOC003', 'AULA-105', 'Cálculo II',                  3, '08:00', '10:00'),
    ('DOC003', 'AULA-104', 'Álgebra Lineal',              5, '10:00', '12:00'),
    -- DOC004 Prof. Sánchez — 3 materias
    ('DOC004', 'AULA-201', 'Programación I',              1, '08:00', '10:00'),
    ('DOC004', 'AULA-201', 'Programación II',             3, '10:00', '12:00'),
    ('DOC004', 'LAB-302',  'Programación Web',            5, '14:00', '16:00'),
    -- DOC005 Prof. Ramírez — 3 materias
    ('DOC005', 'LAB-303',  'Sistemas Operativos',         2, '14:00', '16:00'),
    ('DOC005', 'AULA-203', 'Compiladores',                4, '10:00', '12:00'),
    ('DOC005', 'AULA-203', 'Lenguajes Formales',          5, '08:00', '10:00'),
    -- DOC006 Prof. Torres — 3 materias
    ('DOC006', 'AULA-204', 'Estadística',                 1, '16:00', '18:00'),
    ('DOC006', 'AULA-204', 'Probabilidad',                3, '12:00', '14:00'),
    ('DOC006', 'AULA-205', 'Análisis Numérico',           4, '14:00', '16:00'),
    -- DOC007 Prof. Castro — 2 materias
    ('DOC007', 'AULA-205', 'Ética Profesional',           1, '12:00', '14:00'),
    ('DOC007', 'AULA-206', 'Gestión de Proyectos',        4, '16:00', '18:00'),
    -- DOC008 Prof. Vargas — 2 materias
    ('DOC008', 'LAB-304',  'Robótica',                    2, '16:00', '18:00'),
    ('DOC008', 'LAB-304',  'Visión por Computador',       5, '12:00', '14:00'),
    -- DOC009 Prof. Mendoza — 2 materias
    ('DOC009', 'AULA-206', 'Calidad de Software',         1, '10:00', '12:00'),
    ('DOC009', 'AULA-105', 'Ingeniería de Requisitos',    3, '16:00', '18:00'),
    -- DOC010 Prof. Jiménez — 2 materias
    ('DOC010', 'AULA-102', 'Matemáticas Discretas',       2, '08:00', '10:00'),
    ('DOC010', 'AULA-103', 'Teoría de Grafos',            4, '12:00', '14:00'),
    -- DOC011 Prof. Ortiz — 2 materias
    ('DOC011', 'LAB-305',  'Internet de las Cosas',       1, '14:00', '16:00'),
    ('DOC011', 'LAB-305',  'Computación en la Nube',      5, '16:00', '18:00'),
    -- DOC012 Prof. Reyes — 2 materias
    ('DOC012', 'AULA-103', 'Inglés Técnico',              3, '14:00', '16:00'),
    ('DOC012', 'LAB-303',  'Comunicación Oral',           5, '10:00', '12:00')
) AS v(codigo_docente, codigo_aula, materia, dia_semana, hora_inicio, hora_fin)
JOIN aulas a ON a.codigo = v.codigo_aula
JOIN users u ON u.codigo = v.codigo_docente
WHERE NOT EXISTS (
    SELECT 1 FROM horarios h
    WHERE h.docente_id = u.id
      AND h.aula_id    = a.id
      AND h.materia    = v.materia
      AND h.dia_semana = v.dia_semana
);

-- ============================================================================
-- 4) INSCRIPCIONES — cada estudiante en 5-7 horarios al azar
--    Los 3 originales ya tienen 6 inscripciones (init.sql, materias de DOC001);
--    para ellos se añade material adicional aleatorio respetando ON CONFLICT.
-- ============================================================================

WITH targets AS (
    SELECT u.id AS user_id,
           5 + floor(random() * 3)::int AS n        -- 5, 6 o 7
    FROM users u
    WHERE u.rol = 'estudiante'
),
ranked AS (
    SELECT u.id AS user_id,
           h.id AS horario_id,
           ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY random()) AS rn
    FROM users u
    CROSS JOIN horarios h
    WHERE u.rol = 'estudiante'
)
INSERT INTO inscripciones (user_id, horario_id)
SELECT r.user_id, r.horario_id
FROM ranked r
JOIN targets t ON t.user_id = r.user_id
WHERE r.rn <= t.n
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5) ASISTENCIA — 13 semanas, 2026-03-02 → 2026-05-26
--    Probabilidad de asistir = 0.82 (≈85% con jitter), jitter llegada 0-15 min
--
--    IMPORTANTE: si init.sql ya inyectó ~30 asistencias dummy para los 3
--    estudiantes originales, esos registros conviven con los aquí generados.
--    No hay UNIQUE en asistencia, así que no se eliminan; el conteo final
--    puede salir ~30 por encima del objetivo.
-- ============================================================================

WITH semanas AS (
    SELECT generate_series(0, 12) AS w     -- 13 semanas
)
INSERT INTO asistencia (user_id, aula_id, horario_id, timestamp_in, metodo, valido)
SELECT
    i.user_id,
    h.aula_id,
    i.horario_id,
    (
        (DATE '2026-03-02' + (s.w * 7) + (h.dia_semana - 1))::timestamp
        + h.hora_inicio
        + (random() * INTERVAL '15 minutes')
    ) AT TIME ZONE 'America/Bogota'      AS timestamp_in,
    'qr',
    true
FROM inscripciones i
JOIN horarios h ON h.id = i.horario_id
CROSS JOIN semanas s
WHERE random() < 0.82;

-- ============================================================================
-- 6) VERIFICACIÓN — totales tras la siembra
-- ============================================================================

DO $$
DECLARE
    n_adm   INT;
    n_doc   INT;
    n_est   INT;
    n_aul   INT;
    n_hor   INT;
    n_ins   INT;
    n_asi   INT;
BEGIN
    SELECT count(*) INTO n_adm FROM users WHERE rol = 'administrador';
    SELECT count(*) INTO n_doc FROM users WHERE rol = 'docente';
    SELECT count(*) INTO n_est FROM users WHERE rol = 'estudiante';
    SELECT count(*) INTO n_aul FROM aulas;
    SELECT count(*) INTO n_hor FROM horarios;
    SELECT count(*) INTO n_ins FROM inscripciones;
    SELECT count(*) INTO n_asi FROM asistencia;

    RAISE NOTICE '--------------------------------------------------';
    RAISE NOTICE 'Seed expandida aplicada. Totales actuales:';
    RAISE NOTICE '  Administradores : %', n_adm;
    RAISE NOTICE '  Docentes        : %', n_doc;
    RAISE NOTICE '  Estudiantes     : %', n_est;
    RAISE NOTICE '  Aulas           : %', n_aul;
    RAISE NOTICE '  Horarios        : %', n_hor;
    RAISE NOTICE '  Inscripciones   : %', n_ins;
    RAISE NOTICE '  Asistencias     : %', n_asi;
    RAISE NOTICE '--------------------------------------------------';
END $$;

COMMIT;
