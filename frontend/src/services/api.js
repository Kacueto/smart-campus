import axios from "axios";

// En producción VITE_API_URL viene de .env.production (ej: https://smart-campus-kevin.duckdns.org).
// En desarrollo local, sin esa variable, se usa http://localhost:8000.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Interceptor — agrega el token automáticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
/** Autentica al usuario y retorna access_token, rol y nombre. */
export const login = async (codigo, password) => {
  const { data } = await api.post("/auth/login", { codigo, password });
  return data;
};

/** Revoca el token en el backend y limpia localStorage. */
export const logout = async () => {
  await api.post("/auth/logout");
  localStorage.removeItem("token");
  localStorage.removeItem("authUser");
};

/** Retorna los datos del usuario autenticado desde el token. */
export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

/** Genera un short code QR de 12 chars para el aula indicada (TTL 30s). */
export const generateQRToken = async (aulaId) => {
  const { data } = await api.post(`/auth/qr-token?aula_id=${aulaId}`);
  return data;
};

export default api;

// Asistencia
/** Retorna porcentaje de asistencia y las últimas 5 entradas del estudiante. */
export const getMisEstadisticas = async () => {
  const { data } = await api.get("/asistencia/mis-estadisticas");
  return data;
};

// Horarios
/** Retorna el horario semanal completo del estudiante autenticado. */
export const getMisClases = async () => {
  const { data } = await api.get("/horarios/mis-clases");
  return data;
};

// Profesor
/** Retorna las clases del docente para el día actual. */
export const getMisClasesHoy = async () => {
  const { data } = await api.get("/profesor/mis-clases-hoy");
  return data;
};

/** Retorna todas las clases activas del docente en el semestre. */
export const getTodasMisClases = async () => {
  const { data } = await api.get("/profesor/todas-mis-clases");
  return data;
};

/** Inicia sesión de asistencia y genera el QR del profesor para el aula y horario indicados. */
export const generarQRProfesor = async (aulaId, minutos, horarioId) => {
  const { data } = await api.post(`/profesor/generar-qr?aula_id=${aulaId}&minutos=${minutos}&horario_id=${horarioId}`);
  return data;
};

/** Retorna la lista de estudiantes que han escaneado QR en la sesión activa del horario. */
export const getAsistenciaSesion = async (horarioId) => {
  const { data } = await api.get(`/profesor/asistencia-sesion/${horarioId}`);
  return data;
};

/** Retorna todos los inscritos de la clase con indicador de si asistieron hoy. */
export const getListaClase = async (horarioId) => {
  const { data } = await api.get(`/profesor/lista-clase/${horarioId}`);
  return data;
};

/** Cierra la sesión de asistencia activa y notifica al nodo edge vía MQTT. */
export const cerrarSesionProfesor = async (aulaId) => {
  const { data } = await api.post(`/profesor/cerrar-sesion?aula_id=${aulaId}`);
  return data;
};

// QR Token estudiante


// Reservas
/** Retorna aulas disponibles (sin clase ni reserva) para la fecha, hora y duración indicadas. */
export const getAulasDisponibles = async (fecha, horaInicio, duracionHoras) => {
  const { data } = await api.get(`/reservas/aulas-disponibles?fecha=${fecha}&hora_inicio=${horaInicio}&duracion_horas=${duracionHoras}`);
  return data;
};

/** Crea una reserva de aula para el usuario autenticado. */
export const crearReserva = async (aulaId, inicio, duracionHoras) => {
  const { data } = await api.post("/reservas/crear", { aula_id: aulaId, inicio, duracion_horas: duracionHoras });
  return data;
};

/** Retorna las reservas activas y futuras del usuario autenticado. */
export const getMisReservas = async () => {
  const { data } = await api.get("/reservas/mis-reservas");
  return data;
};

/** Cancela una reserva activa del usuario por su ID. */
export const cancelarReserva = async (reservaId) => {
  const { data } = await api.delete(`/reservas/cancelar/${reservaId}`);
  return data;
};

// Admin
/** Retorna estadísticas globales del sistema para el dashboard de administrador. */
export const getAdminStats = async () => {
  const { data } = await api.get("/admin/stats");
  return data;
};

/** Retorna la lista completa de usuarios del sistema. */
export const getAdminUsuarios = async () => {
  const { data } = await api.get("/admin/usuarios");
  return data;
};

/** Crea un nuevo usuario (solo administradores). */
export const crearAdminUsuario = async (payload) => {
  const { data } = await api.post("/admin/usuarios", payload);
  return data;
};

/** Activa o desactiva un usuario por su ID. */
export const toggleAdminUsuario = async (userId) => {
  const { data } = await api.patch(`/admin/usuarios/${userId}/toggle`);
  return data;
};

/** Retorna la lista de aulas registradas en el sistema. */
export const getAdminAulas = async () => {
  const { data } = await api.get("/admin/aulas");
  return data;
};

/** Crea una nueva aula en el sistema. */
export const crearAdminAula = async (payload) => {
  const { data } = await api.post("/admin/aulas", payload);
  return data;
};

/** Retorna el historial de accesos y alertas del sistema (por defecto últimos 50). */
export const getAdminAccesos = async (limit = 50) => {
  const { data } = await api.get(`/admin/accesos?limit=${limit}`);
  return data;
};

/** Retorna todos los horarios activos del sistema. */
export const getAdminHorarios = async () => {
  const { data } = await api.get("/admin/horarios");
  return data;
};

/** Retorna alertas de seguridad de las últimas 24 horas. */
export const getAdminAlertas = async () => {
  const { data } = await api.get("/admin/alertas");
  return data;
};
