import axios from "axios";

const API_URL = "http://localhost:8000";

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
export const login = async (codigo, password) => {
  const { data } = await api.post("/auth/login", { codigo, password });
  return data;
};

export const logout = async () => {
  await api.post("/auth/logout");
  localStorage.removeItem("token");
  localStorage.removeItem("authUser");
};

export const getMe = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const generateQRToken = async (aulaId) => {
  const { data } = await api.post(`/auth/qr-token?aula_id=${aulaId}`);
  return data;
};

export default api;

// Asistencia
export const getMisEstadisticas = async () => {
  const { data } = await api.get("/asistencia/mis-estadisticas");
  return data;
};

// Horarios
export const getMisClases = async () => {
  const { data } = await api.get("/horarios/mis-clases");
  return data;
};

// Profesor
export const getMisClasesHoy = async () => {
  const { data } = await api.get("/profesor/mis-clases-hoy");
  return data;
};

export const getTodasMisClases = async () => {
  const { data } = await api.get("/profesor/todas-mis-clases");
  return data;
};

export const generarQRProfesor = async (aulaId, minutos, horarioId) => {
  const { data } = await api.post(`/profesor/generar-qr?aula_id=${aulaId}&minutos=${minutos}&horario_id=${horarioId}`);
  return data;
};

export const getAsistenciaSesion = async (horarioId) => {
  const { data } = await api.get(`/profesor/asistencia-sesion/${horarioId}`);
  return data;
};

// QR Token estudiante


// Reservas
export const getAulasDisponibles = async (fecha, horaInicio, duracionHoras) => {
  const { data } = await api.get(`/reservas/aulas-disponibles?fecha=${fecha}&hora_inicio=${horaInicio}&duracion_horas=${duracionHoras}`);
  return data;
};

export const crearReserva = async (aulaId, inicio, duracionHoras) => {
  const { data } = await api.post("/reservas/crear", { aula_id: aulaId, inicio, duracion_horas: duracionHoras });
  return data;
};

export const getMisReservas = async () => {
  const { data } = await api.get("/reservas/mis-reservas");
  return data;
};

export const cancelarReserva = async (reservaId) => {
  const { data } = await api.delete(`/reservas/cancelar/${reservaId}`);
  return data;
};
