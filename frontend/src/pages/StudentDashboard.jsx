import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode } from "@tabler/icons-react";
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
    <article className="grid gap-2 rounded-lg border border-title/10 bg-white p-3 md:grid-cols-[140px_1fr_auto]">
      <div className="min-w-0">
        <h3 className="font-title text-xl text-title">{item.materia}</h3>
        <p className="text-sm text-body">{item.profesor}</p>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-bold">
          <p className="text-sm text-title">{item.dia}</p>
          <p className="text-sm text-title">{item.horario}</p>
        </div>

        <p className="text-sm font-medium text-body">{item.aula}</p>
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
      const inicio = `${reservationDate}T${reservationTime}:00`;

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
                <div className="relative grid gap-1 rounded-lg bg-white p-3 text-sm ring-1 ring-title/10 sm:grid-cols-3">
                  <h2 className="text-xl font-bold text-title">
                    {nextClass.materia}
                  </h2>

                  <p className="text-sm font-bold text-title">
                    {nextClass.dia}
                  </p>

                  <p className="text-sm text-body">{nextClass.horario}</p>

                  <p className="font-semibold text-title">{nextClass.aula}</p>

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
                    className="absolute bottom-0 right-3 top-0 text-sm font-semibold text-title"
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
                      todayClasses.map((item) => (
                        <ClassCard key={item.id} item={item} />
                      ))
                    ) : (
                      <p className="text-sm text-body">No hay clases hoy.</p>
                    )}
                  </div>
                </div>

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
                      weekClasses.map((item) => (
                        <ClassCard key={item.id} item={item} />
                      ))
                    )}
                  </div>
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

                {!statsLoading && !statsError && stats.ultimas.length === 0 && (
                  <p className="text-sm text-body/60">
                    Aún no tienes registros de asistencia.
                  </p>
                )}

                {!statsLoading &&
                  !statsError &&
                  stats.ultimas.map((entry, index) => (
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
                    "07:00",
                    "08:00",
                    "09:00",
                    "10:00",
                    "11:00",
                    "12:00",
                    "13:00",
                    "14:00",
                    "15:00",
                    "16:00",
                    "17:00",
                    "18:00",
                  ].map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
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
