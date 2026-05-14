export const loginRoles = {
  teacher: {
    label: "Profesor",
    title: "Acceso para profesores",
    description:
      "Gestiona tus clases, consulta reservas de aulas y registra asistencia de manera rápida.",
    redirectLabel: "Ingresar como profesor",
    helperText: "Usa tus credenciales institucionales de profesor.",
  },

  student: {
    label: "Estudiante",
    title: "Acceso para estudiantes",
    description:
      "Consulta tus clases, confirma asistencia y revisa el estado de tus reservas o espacios asignados.",
    redirectLabel: "Ingresar como estudiante",
    helperText: "Usa tu correo institucional de estudiante.",
  },

  classroomAdmin: {
    label: "Administrador de aulas",
    title: "Acceso para administración de aulas",
    description:
      "Supervisa reservas, disponibilidad de salones, asistencia y uso de espacios académicos.",
    redirectLabel: "Ingresar como administrador",
    helperText: "Acceso reservado para personal autorizado.",
  },
};
