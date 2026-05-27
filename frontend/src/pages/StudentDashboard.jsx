import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode, IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import {
  getMisEstadisticas,
  getMisClases,
  getAulasDisponibles,
  crearReserva,
  getMisReservas,
  cancelarReserva,
} from "../services/api";
import Clock from "../components/Clock";

function ClassCard({ item }) {
  return (
    <article className="flex flex-col md:flex-row items-start rounded-lg border border-title/10 bg-white p-3 md:flex md:items-center md:justify-between lg:gap-6">
      <div className="min-w-0">
        <h3 className="truncate font-title text-xl text-title">
          {item.materia}
        </h3>

        <p className="truncate text-sm text-body">{item.profesor}</p>
      </div>

      <div className="flex justify-between md:flex-col w-full md:w-auto">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold">
          <p className="text-sm text-title">{item.dia}</p>
          <p className="text-sm text-title">{item.horario}</p>
        </div>

        <p className="text-sm font-medium text-body md:text-right">
          {item.aula}
        </p>
      </div>
    </article>
  );
}

function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-end gap-4 text-xs">
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="font-bold text-title disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconChevronLeft />
      </button>

      <span className="font-bold text-body">
        Página {page} de {totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="font-bold text-title disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconChevronRight />
      </button>
    </div>
  );
}

export default function StudentDashboard() {
  const ITEMS_PER_PAGE = 5;
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  const [selectedRoom, setSelectedRoom] = useState("");
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [duracion, setDuracion] = useState(1);
  const [successMessage, setSuccessMessage] = useState("");
  const [reservaError, setReservaError] = useState(null);
  const [aulasDisponibles, setAulasDisponibles] = useState([]);
  const [aulasLoading, setAulasLoading] = useState(false);
  const [misReservas, setMisReservas] = useState([]);
  const [reservasLoading, setReservasLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(null);
  const [clases, setClases] = useState([]);
  const [clasesLoading, setClasesLoading] = useState(true);
  const [todayClassesPage, setTodayClassesPage] = useState(1);
  const [weekClassesPage, setWeekClassesPage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);

  const fetchMisReservas = () => {
    setReservasLoading(true);

    getMisReservas()
      .then(setMisReservas)
      .catch(console.error)
      .finally(() => setReservasLoading(false));
  };

  useEffect(() => {
    getMisEstadisticas()
      .then(setStats)
      .catch(() => setStatsError("No se pudieron cargar las estadísticas."))
      .finally(() => setStatsLoading(false));
  }, []);

  useEffect(() => {
    getMisClases()
      .then(setClases)
      .catch(console.error)
      .finally(() => setClasesLoading(false));
  }, []);

  useEffect(() => {
    fetchMisReservas();
  }, []);

  useEffect(() => {
    if (!reservationDate || !reservationTime) return;

    setAulasLoading(true);
    setSelectedRoom("");

    getAulasDisponibles(reservationDate, reservationTime, duracion)
      .then(setAulasDisponibles)
      .catch(() => setAulasDisponibles([]))
      .finally(() => setAulasLoading(false));
  }, [reservationDate, reservationTime, duracion]);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  const handleReservation = async (event) => {
    event.preventDefault();

    if (!selectedRoom) return;

    setSubmitting(true);
    setReservaError(null);
    setSuccessMessage("");

    try {
      const inicio = `${reservationDate}T${reservationTime}:00-05:00`;

      await crearReserva(selectedRoom, inicio, duracion);

      setSuccessMessage("Reserva creada correctamente.");
      setSelectedRoom("");
      setReservationDate("");
      setReservationTime("");
      setDuracion(1);
      setAulasDisponibles([]);

      fetchMisReservas();
    } catch (err) {
      setReservaError(
        err.response?.data?.detail || "No se pudo crear la reserva."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelar = async (reservaId) => {
    try {
      await cancelarReserva(reservaId);
      fetchMisReservas();
    } catch (err) {
      alert(err.response?.data?.detail || "No se pudo cancelar.");
    }
  };

  if (!authUser || authUser.role !== "estudiante") {
    return <Navigate to="/login/estudiante" replace />;
  }

  const hoy = new Date().getDay();
  const diaMap = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  const diaHoy = diaMap[hoy];

  const todayClasses = clases.filter((c) => c.dia_semana === diaHoy);
  const weekClasses = clases.filter((c) => c.dia_semana !== diaHoy);
  const nextClass = todayClasses[0] ?? clases[0];
  const latestAttendance = stats?.ultimas ?? [];

  const todayClassesTotalPages = Math.ceil(todayClasses.length / ITEMS_PER_PAGE);
  const weekClassesTotalPages = Math.ceil(weekClasses.length / ITEMS_PER_PAGE);
  const attendanceTotalPages = Math.ceil(latestAttendance.length / ITEMS_PER_PAGE);

  const paginatedTodayClasses = todayClasses.slice(
    (todayClassesPage - 1) * ITEMS_PER_PAGE,
    todayClassesPage * ITEMS_PER_PAGE
  );

  const paginatedWeekClasses = weekClasses.slice(
    (weekClassesPage - 1) * ITEMS_PER_PAGE,
    weekClassesPage * ITEMS_PER_PAGE
  );

  const paginatedLatestAttendance = latestAttendance.slice(
    (attendancePage - 1) * ITEMS_PER_PAGE,
    attendancePage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setTodayClassesPage(1);
    setWeekClassesPage(1);
  }, [clases]);

  useEffect(() => {
    setAttendancePage(1);
  }, [stats]);

  return (
    <main className="min-h-screen bg-bg font-body text-body">
      <header className="border-b border-title/10 bg-bg p-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock />
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-[#FD7878]"
          >
            <IconLogout2 size={24} />
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-2 p-2 sm:p-6">
        <section className="p-4">
          <div className="grid gap-2 lg:grid-cols-[1fr_auto] lg:items-start">
            <p className="font-title text-5xl font-bold text-st-2">
              Hola, {authUser.nombre}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-130">
              <div className="col-span-2 flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-title/10">
                <p className="text-xs font-medium text-body">
                  % Asistencias en el semestre
                </p>

                <p className="text-xl font-bold text-title">
                  {statsLoading ? "—" : statsError ? "?" : stats.porcentaje}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-title/10">
                <p className="text-xs font-medium text-body">
                  Clases por semana
                </p>

                <p className="text-xl font-bold text-title">
                  {statsLoading ? "—" : statsError ? "?" : stats.clases_semana}
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 rounded-lg bg-white px-3 py-2 ring-1 ring-title/10">
                <p className="text-xs font-medium text-body">
                  Total asistidas
                </p>

                <p className="text-xl font-bold text-title">
                  {statsLoading
                    ? "—"
                    : statsError
                      ? "?"
                      : stats.total_asistidas}
                </p>
              </div>
            </div>
          </div>

          {statsError && (
            <p className="mt-3 text-xs text-rose-500">{statsError}</p>
          )}
        </section>

        <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
          <div className="grid gap-4">
            <section className="flex flex-col gap-1 p-4">
              <p className="font-title text-3xl font-bold text-st-2">
                Próxima clase
              </p>

              {clasesLoading ? (
                <p className="text-sm text-body/60">Cargando...</p>
              ) : nextClass ? (
                <div className="relative grid rounded-lg bg-white p-3 pr-14 text-sm ring-1 ring-title/10 sm:grid-cols-[1fr_auto_auto] sm:items-center lg:grid-cols-[minmax(0,1.4fr)_auto_auto_auto] lg:gap-6">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-title">
                      {nextClass.materia}
                    </h2>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 sm:justify-end">
                    <p className="text-sm font-bold text-title">{nextClass.dia}</p>
                    <p className="text-sm text-body">{nextClass.horario}</p>
                  </div>

                  <p className="text-sm font-semibold text-title sm:text-right">
                    {nextClass.aula}
                  </p>

                  <button
                    onClick={() =>
                      navigate("/qr", {
                        state: {
                          aulaId: nextClass.aula_id,
                          materia: nextClass.materia,
                          aula: nextClass.aula,
                        },
                      })
                    }
                    className="absolute bottom-0 right-3 top-0 flex items-center text-title"
                    aria-label="Generar código QR"
                  >
                    <IconQrcode stroke={2} size={32} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-body/60">
                  No hay clases programadas.
                </p>
              )}

              <p className="text-sm leading-6 text-body">
                Recuerda validar tu asistencia al ingresar al aula.
              </p>
            </section>

            <section className="p-4">
              <h2 className="font-title text-3xl font-bold text-st-2">
                Mi horario
              </h2>

              <div className="grid gap-6">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-title/10 pb-2">
                    <h3 className="text-sm font-bold text-title">
                      Clases de hoy
                    </h3>

                    <span className="text-xs font-bold text-body">
                      {todayClasses.length}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {clasesLoading ? (
                      <p className="text-sm text-body">Cargando...</p>
                    ) : todayClasses.length > 0 ? (
                      paginatedTodayClasses.map((item) => (
                        <ClassCard key={item.id} item={item} />
                      ))
                    ) : (
                      <p className="text-sm text-body">No hay clases hoy.</p>
                    )}
                  </div>
                </div>

                <PaginationControls page={todayClassesPage} totalPages={todayClassesTotalPages} onPageChange={setTodayClassesPage} />

                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-title/10 pb-2">
                    <h3 className="text-sm font-bold text-title">
                      Resto de la semana
                    </h3>

                    <span className="text-xs font-bold text-body">
                      {weekClasses.length}
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {clasesLoading ? (
                      <p className="text-sm text-body">Cargando...</p>
                    ) : (
                      paginatedWeekClasses.map((item) => (
                        <ClassCard key={item.id} item={item} />
                      ))
                    )}
                  </div>

                  <PaginationControls page={weekClassesPage} totalPages={weekClassesTotalPages} onPageChange={setWeekClassesPage} />
                </div>
              </div>
            </section>

            <section className="p-4">
              <h2 className="font-title text-3xl font-bold text-st-2">
                Últimas asistencias
              </h2>

              <div className="grid gap-2">
                {statsLoading && <p className="text-sm text-body">Cargando...</p>}

                {statsError && (
                  <p className="text-sm text-rose-400">{statsError}</p>
                )}

                {!statsLoading && !statsError && latestAttendance.length === 0 && (
                  <p className="text-sm text-body/60">
                    Aún no tienes registros de asistencia.
                  </p>
                )}

                {!statsLoading &&
                  !statsError &&
                  paginatedLatestAttendance.map((entry, index) => (
                    <article
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-title/10 bg-white px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-bold text-title">
                          {entry.materia}
                        </p>

                        <p className="text-xs text-body">{entry.aula}</p>
                      </div>

                      <p className="text-xs font-medium text-body/70">
                        {entry.timestamp}
                      </p>
                    </article>
                  ))}
              </div>

              <PaginationControls page={attendancePage} totalPages={attendanceTotalPages} onPageChange={setAttendancePage} />
            </section>
          </div>

          <aside className="p-4">
            <h2 className="font-title text-3xl font-bold text-st-2">
              Reservar aula
            </h2>

            <p className="text-sm leading-6 text-body">
              Solicita un aula disponible para estudiar, reunirte con tu grupo o
              realizar una actividad académica.
            </p>

            <form className="mt-5 grid gap-4" onSubmit={handleReservation}>
              <label className="grid gap-2 text-sm font-bold text-title">
                Fecha
                <input
                  type="date"
                  value={reservationDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReservationDate(e.target.value)}
                  required
                  className="w-full rounded border border-title/10 bg-white px-3 py-3 text-title outline-none focus:border-title"
                />
              </label>

              <label className="grid gap-2 text-sm font-bold text-title">
                Hora de inicio
                <select
                  value={reservationTime}
                  onChange={(e) => setReservationTime(e.target.value)}
                  required
                  className="w-full rounded border border-title/10 bg-white px-3 py-3 text-title outline-none focus:border-title"
                >
                  <option value="">Selecciona una hora</option>

                  {[
                    "07:00","08:00","09:00","10:00","11:00","12:00",
                    "13:00","14:00","15:00","16:00","17:00",
                  ].filter((h) => {
                    const [hr] = h.split(":").map(Number);
                    return hr + duracion <= 18;
                  }).map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-title">
                Duración
                <select
                  value={duracion}
                  onChange={(e) => setDuracion(Number(e.target.value))}
                  className="w-full rounded border border-title/10 bg-white px-3 py-3 text-title outline-none focus:border-title"
                >
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={3}>3 horas</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-title">
                Aula disponible
                {aulasLoading ? (
                  <p className="py-2 text-sm text-body/60">
                    Buscando aulas...
                  </p>
                ) : !reservationDate || !reservationTime ? (
                  <p className="py-2 text-xs text-body/60">
                    Selecciona fecha y hora para ver aulas disponibles.
                  </p>
                ) : aulasDisponibles.length === 0 ? (
                  <p className="py-2 text-xs text-rose-400">
                    No hay aulas disponibles en ese horario.
                  </p>
                ) : (
                  <select
                    value={selectedRoom}
                    onChange={(e) => setSelectedRoom(e.target.value)}
                    required
                    className="w-full rounded border border-title/10 bg-white px-3 py-3 text-title outline-none focus:border-title"
                  >
                    <option value="">Selecciona un aula</option>

                    {aulasDisponibles.map((aula) => (
                      <option key={aula.id} value={aula.id}>
                        {aula.edificio} - {aula.nombre} · Cap. {aula.capacidad}
                      </option>
                    ))}
                  </select>
                )}
              </label>

              {reservaError && (
                <p className="rounded border border-rose-100 bg-rose-50 px-3 py-2 text-sm text-rose-500">
                  {reservaError}
                </p>
              )}

              {successMessage && (
                <p className="rounded border border-green-100 bg-green-50 px-3 py-2 text-sm text-green-700">
                  {successMessage}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedRoom}
                className="rounded bg-title px-4 py-3 font-bold text-bg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Reservando..." : "Confirmar reserva"}
              </button>
            </form>

            <div className="mt-6">
              <h3 className="flex items-center justify-between border-b border-title/10 pb-2 text-sm font-bold text-title">
                Mis reservas activas
                <span>{misReservas.length}</span>
              </h3>

              <div className="mt-3 grid gap-3">
                {reservasLoading ? (
                  <p className="text-sm text-body/60">Cargando...</p>
                ) : misReservas.length === 0 ? (
                  <p className="text-sm text-body/60">
                    No tienes reservas activas.
                  </p>
                ) : (
                  misReservas.map((r) => (
                    <article
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-title/10 bg-white p-3 text-sm"
                    >
                      <div>
                        <p className="font-bold text-title">{r.aula}</p>

                        <p className="text-body">
                          {r.inicio} — {r.fin}
                        </p>
                      </div>

                      <button
                        onClick={() => handleCancelar(r.id)}
                        className="shrink-0 text-xs font-bold text-[#FD7878]"
                      >
                        Cancelar
                      </button>
                    </article>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
