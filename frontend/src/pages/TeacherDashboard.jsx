import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  IconLogout2,
  IconCheck,
  IconX,
  IconClock,
} from "@tabler/icons-react";

// const currentClass = null;

const currentClass = {
  id: 2,
  subject: "Sistemas Ciberfísicos",
  day: "Martes",
  time: "10:00 - 12:00",
  classroom: "Laboratorio IoT - Sala 2",
  status: "En curso",
  students: [
    {
      id: 1,
      name: "Luis Herrera",
      code: "202407654",
      attendance: "present",
    },
    {
      id: 2,
      name: "Valentina Castro",
      code: "202408912",
      attendance: "present",
    },
    {
      id: 3,
      name: "Andrés Gómez",
      code: "202406341",
      attendance: "pending",
    },
    {
      id: 4,
      name: "Sofía Mejía",
      code: "202409112",
      attendance: "pending",
    },
    {
      id: 5,
      name: "Camilo Díaz",
      code: "202405781",
      attendance: "absent",
    },
  ],
};

const pastClasses = [
  {
    id: 101,
    subject: "Arquitectura de Software",
    date: "Lunes, 27 de abril",
    time: "08:00 - 10:00",
    classroom: "Bloque G - Aula 203",
    students: [
      {
        id: 1,
        name: "Alejandro Polo",
        code: "202412345",
        attendance: "present",
      },
      {
        id: 2,
        name: "María Fernanda Ruiz",
        code: "202410882",
        attendance: "present",
      },
      {
        id: 3,
        name: "Carlos Mendoza",
        code: "202411230",
        attendance: "absent",
      },
      {
        id: 4,
        name: "Daniela Torres",
        code: "202409871",
        attendance: "present",
      },
    ],
  },
  {
    id: 102,
    subject: "Gestión Integrada en TI",
    date: "Miércoles, 22 de abril",
    time: "14:00 - 16:00",
    classroom: "Bloque D - Aula 110",
    students: [
      {
        id: 1,
        name: "Laura Martínez",
        code: "202401245",
        attendance: "present",
      },
      {
        id: 2,
        name: "Juan Sebastián Peña",
        code: "202403567",
        attendance: "absent",
      },
      {
        id: 3,
        name: "Natalia Rojas",
        code: "202402879",
        attendance: "present",
      },
      {
        id: 4,
        name: "Mateo Rodríguez",
        code: "202405432",
        attendance: "present",
      },
    ],
  },
  {
    id: 103,
    subject: "Criptografía",
    date: "Viernes, 17 de abril",
    time: "07:00 - 09:00",
    classroom: "Bloque K - Aula 305",
    students: [
      {
        id: 1,
        name: "Miguel Ángel Pérez",
        code: "202400982",
        attendance: "present",
      },
      {
        id: 2,
        name: "Isabella Ramírez",
        code: "202404126",
        attendance: "present",
      },
      {
        id: 3,
        name: "Gabriel Silva",
        code: "202406789",
        attendance: "absent",
      },
    ],
  },
];

const upcomingClasses = [
  {
    id: 201,
    subject: "Arquitectura de Software",
    day: "Jueves",
    time: "08:00 - 10:00",
    classroom: "Bloque G - Aula 203",
  },
  {
    id: 202,
    subject: "Criptografía",
    day: "Viernes",
    time: "07:00 - 09:00",
    classroom: "Bloque K - Aula 305",
  },
];

const attendanceLabels = {
  present: {
    label: "Asistió",
    icon: IconCheck,
    className: "bg-green-100 text-green-700",
  },
  absent: {
    label: "No asistió",
    icon: IconX,
    className: "bg-rose-100 text-rose-700",
  },
  pending: {
    label: "Pendiente",
    icon: IconClock,
    className: "bg-slate-200 text-slate-700",
  },
};

function getAttendanceStats(students = []) {
  return students.reduce(
    (stats, student) => {
      stats.total += 1;
      stats[student.attendance] += 1;
      return stats;
    },
    {
      total: 0,
      present: 0,
      absent: 0,
      pending: 0,
    }
  );
}

function AttendanceStatus({ status }) {
  const statusData = attendanceLabels[status];
  const Icon = statusData.icon;

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded px-2 py-1 text-xs font-bold ${statusData.className}`}
    >
      <Icon size={14} />
      {statusData.label}
    </span>
  );
}

function AttendanceSummary({ students }) {
  const stats = getAttendanceStats(students);

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <div className="rounded bg-slate-200 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Total</p>
        <p className="text-xl font-bold text-slate-900">{stats.total}</p>
      </div>

      <div className="rounded bg-green-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Asistieron</p>
        <p className="text-xl font-bold text-green-700">{stats.present}</p>
      </div>

      <div className="rounded bg-rose-100 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">No asistieron</p>
        <p className="text-xl font-bold text-rose-700">{stats.absent}</p>
      </div>

      <div className="rounded bg-slate-200 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">Pendientes</p>
        <p className="text-xl font-bold text-slate-700">{stats.pending}</p>
      </div>
    </div>
  );
}

function StudentAttendanceList({ students }) {
  return (
    <div className="grid gap-3">
      {students.map((student) => (
        <article
          key={student.id}
          className="grid gap-3 rounded border border-slate-200 bg-white p-3 text-sm sm:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="font-bold text-slate-900">{student.name}</p>

            <p className="mt-1 text-slate-500">Código {student.code}</p>
          </div>

          <div className="flex items-center sm:justify-end">
            <AttendanceStatus status={student.attendance} />
          </div>
        </article>
      ))}
    </div>
  );
}

function UpcomingClassCard({ item }) {
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <h3 className="font-bold text-slate-900">{item.subject}</h3>

      <p className="mt-1 text-sm text-slate-500">
        {item.day} · {item.time}
      </p>

      <p className="mt-2 text-sm font-medium text-slate-700">
        {item.classroom}
      </p>
    </article>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  const [selectedPastClassId, setSelectedPastClassId] = useState(
    pastClasses[0]?.id ?? ""
  );

  if (!authUser || authUser.role !== "teacher") {
    return <Navigate to="/login/profesor" replace />;
  }

  const selectedPastClass =
    pastClasses.find((item) => item.id === Number(selectedPastClassId)) ??
    pastClasses[0];

  const currentStats = currentClass
    ? getAttendanceStats(currentClass.students)
    : null;

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    navigate("/login/profesor");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Smart Campus</p>
            <p className="text-xs text-slate-500">Panel del profesor</p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-rose-500"
          >
            <IconLogout2 size={18} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 p-2 sm:p-6">
        {/* Bienvenida */}
        <section className="p-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-3xl font-bold text-blue-300">
                Hola, {authUser.name}
              </p>

              <p className="text-sm text-slate-500">
                Revisa tu clase actual y consulta la asistencia de clases
                anteriores.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-110">
              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">
                  Clases pasadas
                </p>
                <p className="text-xl font-bold">{pastClasses.length}</p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">
                  Próximas
                </p>
                <p className="text-xl font-bold">{upcomingClasses.length}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_430px]">
          <div className="grid gap-5">
            {/* Clase actual */}
            <section className="p-4">
              <h2 className="text-2xl font-bold text-blue-300">
                Clase actual
              </h2>

              {currentClass ? (
                <div className="mt-5 grid gap-4">
                  <div className="rounded bg-blue-100 p-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div>
                        <h3 className="text-xl font-bold tracking-[-0.03em] text-slate-900">
                          {currentClass.subject}
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {currentClass.day} · {currentClass.time}
                        </p>

                        <p className="mt-2 text-sm font-semibold text-slate-800">
                          {currentClass.classroom}
                        </p>
                      </div>

                      <span className="w-fit rounded bg-blue-200 px-2.5 py-1 text-xs font-bold text-blue-700">
                        {currentClass.status}
                      </span>
                    </div>
                  </div>

                  <AttendanceSummary students={currentClass.students} />

                  <div>
                    <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                      Lista de alumnos
                      <span>{currentStats.total}</span>
                    </h3>

                    <StudentAttendanceList students={currentClass.students} />
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded border border-slate-200 bg-white p-5">
                  <p className="text-base font-bold text-slate-900">
                    No estás en una clase ahora mismo
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Cuando tengas una clase activa, aquí aparecerá la lista de
                    estudiantes.
                  </p>
                </div>
              )}
            </section>

            {/* Próximas clases */}
            <section className="p-4">
              <h2 className="text-2xl font-bold text-blue-300">
                Próximas clases
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Solo se muestra información del horario. La asistencia estará
                disponible cuando la clase esté activa o haya finalizado.
              </p>

              <div className="mt-5 grid gap-3">
                {upcomingClasses.map((item) => (
                  <UpcomingClassCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          </div>

          {/* Clases pasadas */}
          <aside className="p-4">
            <h2 className="text-2xl font-bold text-blue-300">
              Clases pasadas
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Selecciona una clase finalizada para revisar la asistencia
              registrada.
            </p>

            <label className="mt-5 grid gap-2 text-sm font-bold text-slate-700">
              Clase
              <select
                value={selectedPastClassId}
                onChange={(event) => setSelectedPastClassId(event.target.value)}
                className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-blue-400"
              >
                {pastClasses.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.subject} · {classItem.date}
                  </option>
                ))}
              </select>
            </label>

            {selectedPastClass && (
              <div className="mt-5 grid gap-5">
                <div className="rounded border border-slate-200 bg-white p-4">
                  <h3 className="font-bold text-slate-900">
                    {selectedPastClass.subject}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedPastClass.date} · {selectedPastClass.time}
                  </p>

                  <p className="mt-2 text-sm font-medium text-slate-700">
                    {selectedPastClass.classroom}
                  </p>
                </div>

                <AttendanceSummary students={selectedPastClass.students} />

                <div>
                  <h3 className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                    Asistencia registrada
                    <span>{selectedPastClass.students.length}</span>
                  </h3>

                  <StudentAttendanceList students={selectedPastClass.students} />
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
