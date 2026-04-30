import { useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode } from "@tabler/icons-react";

const schedule = [
  {
    id: 1,
    subject: "Arquitectura de Software",
    teacher: "Dra. Laura Martínez",
    day: "Lunes",
    time: "08:00 - 10:00",
    classroom: "Bloque G - Aula 203",
    status: "Próxima",
    isToday: true,
  },
  {
    id: 2,
    subject: "Sistemas Ciberfísicos",
    teacher: "Ing. Carlos Romero",
    day: "Martes",
    time: "10:00 - 12:00",
    classroom: "Laboratorio IoT - Sala 2",
    status: "Activa",
    isToday: true,
  },
  {
    id: 3,
    subject: "Gestión Integrada en TI",
    teacher: "Mg. Andrea Pérez",
    day: "Miércoles",
    time: "14:00 - 16:00",
    classroom: "Bloque D - Aula 110",
    status: "Próxima",
    isToday: false,
  },
  {
    id: 4,
    subject: "Criptografía",
    teacher: "Dr. Manuel Rivas",
    day: "Viernes",
    time: "07:00 - 09:00",
    classroom: "Bloque K - Aula 305",
    status: "Pendiente",
    isToday: false,
  },
];

const availableRooms = [
  {
    id: 1,
    name: "Aula 201",
    building: "Bloque G",
    capacity: 32,
    type: "Clase regular",
    available: true,
  },
  {
    id: 2,
    name: "Laboratorio IoT",
    building: "Bloque K",
    capacity: 20,
    type: "Laboratorio",
    available: true,
  },
  {
    id: 3,
    name: "Sala de estudio 3",
    building: "Biblioteca",
    capacity: 8,
    type: "Estudio grupal",
    available: false,
  },
];

const activeReservations = [
  {
    id: 1,
    room: "Sala de estudio 3",
    date: "29 de abril",
    time: "15:00",
  },
];

function ClassCard({ item }) {
  return (
    <article className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-[140px_1fr_auto] rounded">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900">{item.subject}</h3>
        <p className="mt-1 text-sm text-slate-500">{item.teacher}</p>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{item.day}</p>
        <p className="text-sm text-slate-500">{item.time}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">
          {item.classroom}
        </p>
      </div>

    </article>
  );
}

export default function StudentDashboard() {
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  const [selectedRoom, setSelectedRoom] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  if (!authUser || authUser.role !== "student") {
    return <Navigate to="/login/estudiante" replace />;
  }

  const todayClasses = schedule.filter((item) => item.isToday);
  const weekClasses = schedule.filter((item) => !item.isToday);

  const attendanceSummary = {
    monthly: "92%",
    attended: 11,
    missed: 1,
    pending: 2,
  };

  const nextClass = todayClasses[1] ?? todayClasses[0] ?? schedule[0];

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    navigate("/login/estudiante");
  };

  const handleReservation = (event) => {
    event.preventDefault();

    const room = availableRooms.find((item) => item.id === Number(selectedRoom));

    if (!room) return;

    setSuccessMessage(
      `Reserva solicitada para ${room.name} el ${reservationDate} a las ${reservationTime}.`
    );

    setSelectedRoom("");
    setReservationDate("");
    setReservationTime("");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-slate-900">Smart Campus</p>
            <p className="text-xs text-slate-500">Panel del estudiante</p>
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

      <section className="mx-auto grid max-w-7xl gap-2 p-4 sm:p-6">
        {/* Bienvenida + asistencia */}
        <section className="p-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-3xl font-bold text-orange-300">
                Hola, {authUser.name}
              </p>

              <p className="text-sm text-slate-500">
                {authUser.program}
                {/* · {authUser.code}*/}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-130">
              <div className="flex items-center justify-between gap-2 rounded bg-green-200 px-3 py-2 col-span-2">
                <p className="text-xs font-medium text-slate-500">
                  % Asistencias en el semestre
                </p>
                <p className="text-xl font-bold">
                  {attendanceSummary.monthly}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">
                  Clases hoy
                </p>
                <p className="text-xl font-bold">{todayClasses.length}</p>
              </div>


              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">
                  Pendientes
                </p>
                <p className="text-xl font-bold">
                  {attendanceSummary.pending}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="grid gap-4">
            {/* 1. Próxima clase */}
            <section className="p-4 flex flex-col gap-4">
                  <p className="text-2xl font-bold text-orange-300">
                    Próxima clase
                  </p>

                {/*<span className="border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600 rounded">
                  {nextClass.status}
                </span>*/}

              <div className="relative grid gap-1 text-sm sm:grid-cols-3 bg-blue-200 p-3 rounded">
                  <h2 className="text-xl font-bold tracking-[-0.03em]">
                    {nextClass.subject}
                  </h2>
                <p className="text-sm font-bold text-slate-900">{nextClass.day}</p>
                <p className="text-sm text-slate-500">{nextClass.time}</p>
                  <p className="font-semibold text-slate-900">
                    {nextClass.classroom}
                </p>
                <button className="absolute top-0 bottom-0 right-3 text-sm font-semibold text-slate-900">
                  <IconQrcode stroke={2} size={32} />
                </button>
              </div>

              <p className="text-sm leading-6 text-slate-500">
                Recuerda validar tu asistencia al ingresar al aula asignada.
              </p>
            </section>

            {/* 2. Clases */}
            <section className="p-4">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-orange-300">
                  Mi horario
                </h2>
              </div>

              <div className="mt-5 grid gap-6">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Clases de hoy
                    </h3>

                    <span className="text-xs font-bold text-slate-500">
                      {todayClasses.length}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {todayClasses.map((item) => (
                      <ClassCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      Resto de la semana
                    </h3>

                    <span className="text-xs font-bold text-slate-500">
                      {weekClasses.length}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {weekClasses.map((item) => (
                      <ClassCard key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </div>
            </section>
          </div>

          {/* 3. Reservas */}
          <aside className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold tracking-[-0.03em] text-orange-300">
                  Reservar aula
                </h2>
              </div>
            </div>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Solicita un aula disponible para estudiar, reunirte con tu grupo o
              realizar una actividad académica.
            </p>

            <form className="mt-5 grid gap-4" onSubmit={handleReservation}>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Aula disponible
                <select
                  value={selectedRoom}
                  onChange={(event) => setSelectedRoom(event.target.value)}
                  required
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-orange-400"
                >
                  <option value="">Selecciona un aula</option>

                  {availableRooms.map((room) => (
                    <option
                      key={room.id}
                      value={room.id}
                      disabled={!room.available}
                    >
                      {room.building} - {room.name} · {room.type}
                      {!room.available ? " · No disponible" : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Fecha
                <input
                  type="date"
                  value={reservationDate}
                  onChange={(event) => setReservationDate(event.target.value)}
                  required
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-orange-400"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Hora
                <input
                  type="time"
                  value={reservationTime}
                  onChange={(event) => setReservationTime(event.target.value)}
                  required
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none focus:border-orange-400"
                />
              </label>

              <button
                type="submit"
                className="bg-orange-300 px-4 py-3 rounded font-bold text-white hover:bg-orange-400"
              >
                Solicitar reserva
              </button>
            </form>

            {successMessage && (
              <div className="mt-5 border border-orange-200 bg-orange-50 p-3 text-sm font-medium leading-6 text-orange-700">
                {successMessage}
              </div>
            )}

            {activeReservations.length > 0 && (
              <div className="mt-6">
                <h3 className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                  Reservas activas
                  <span>{activeReservations.length}</span>
                </h3>

                <div className="mt-3 grid gap-3">
                  {activeReservations.map((reservation) => (
                    <article key={reservation.id} className="p-3 rounded text-sm bg-orange-100 flex justify-between items-center">
                      <p className="font-bold text-slate-900">
                        {reservation.room}
                      </p>
                      <p className="mt-1 text-slate-500">
                        {reservation.date} / {reservation.time}
                      </p>
                    </article>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
