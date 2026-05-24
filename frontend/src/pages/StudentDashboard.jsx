import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode } from "@tabler/icons-react";
import { getMisEstadisticas, getMisClases, getAulasDisponibles, crearReserva, getMisReservas, cancelarReserva } from "../services/api";
import Clock from "../components/Clock";

function ClassCard({ item }) {
  return (
    <article className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-[140px_1fr_auto] rounded">
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900">{item.materia}</h3>
        <p className="mt-1 text-sm text-slate-500">{item.profesor}</p>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">{item.dia}</p>
        <p className="text-sm text-slate-500">{item.horario}</p>
        <p className="mt-2 text-sm font-medium text-slate-700">{item.aula}</p>
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

  const [selectedRoom,     setSelectedRoom]     = useState("");
  const [reservationDate,  setReservationDate]  = useState("");
  const [reservationTime,  setReservationTime]  = useState("");
  const [duracion,         setDuracion]         = useState(1);
  const [successMessage,   setSuccessMessage]   = useState("");
  const [reservaError,     setReservaError]     = useState(null);
  const [aulasDisponibles, setAulasDisponibles] = useState([]);
  const [aulasLoading,     setAulasLoading]     = useState(false);
  const [misReservas,      setMisReservas]      = useState([]);
  const [reservasLoading,  setReservasLoading]  = useState(true);
  const [submitting,       setSubmitting]       = useState(false);
  const [stats,            setStats]            = useState(null);
  const [statsLoading,     setStatsLoading]     = useState(true);
  const [statsError,       setStatsError]       = useState(null);
  const [clases,           setClases]           = useState([]);
  const [clasesLoading,    setClasesLoading]    = useState(true);

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
    navigate("/login/estudiante");
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
      setReservaError(err.response?.data?.detail || "No se pudo crear la reserva.");
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

  const hoy          = new Date().getDay();
  const diaMap       = { 0: 7, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6 };
  const diaHoy       = diaMap[hoy];
  const todayClasses = clases.filter((c) => c.dia_semana === diaHoy);
  const weekClasses  = clases.filter((c) => c.dia_semana !== diaHoy);
  const nextClass    = todayClasses[0] ?? clases[0];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Clock />
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-rose-500">
            <IconLogout2 size={18} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-2 p-2 sm:p-6">
        <section className="p-4">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="text-3xl font-bold text-blue-300">Hola, {authUser.nombre}</p>
              <p className="text-sm text-slate-500">Ingeniería de Sistemas</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-130">
              <div className="flex items-center justify-between gap-2 rounded bg-green-200 px-3 py-2 col-span-2">
                <p className="text-xs font-medium text-slate-500">% Asistencias en el semestre</p>
                <p className="text-xl font-bold">{statsLoading ? "—" : statsError ? "?" : stats.porcentaje}</p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Clases por semana</p>
                <p className="text-xl font-bold">{statsLoading ? "—" : statsError ? "?" : stats.clases_semana}</p>
              </div>
              <div className="flex items-center justify-between gap-2 rounded bg-slate-200 px-3 py-2">
                <p className="text-xs font-medium text-slate-500">Total asistidas</p>
                <p className="text-xl font-bold">{statsLoading ? "—" : statsError ? "?" : stats.total_asistidas}</p>
              </div>
            </div>
          </div>
          {statsError && <p className="mt-3 text-xs text-rose-500">{statsError}</p>}
        </section>

        <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
          <div className="grid gap-4">
            <section className="p-4 flex flex-col gap-4">
              <p className="text-2xl font-bold text-blue-300">Próxima clase</p>
              {clasesLoading ? (
                <p className="text-sm text-slate-400">Cargando...</p>
              ) : nextClass ? (
                <div className="relative grid gap-1 text-sm sm:grid-cols-3 bg-blue-200 p-3 rounded">
                  <h2 className="text-xl font-bold tracking-[-0.03em]">{nextClass.materia}</h2>
                  <p className="text-sm font-bold text-slate-900">{nextClass.dia}</p>
                  <p className="text-sm text-slate-500">{nextClass.horario}</p>
                  <p className="font-semibold text-slate-900">{nextClass.aula}</p>
                  <button
                    onClick={() => navigate("/qr", { state: { aulaId: nextClass.aula_id, materia: nextClass.materia, aula: nextClass.aula } })}
                    className="absolute top-0 bottom-0 right-3 text-sm font-semibold text-slate-900"
                  >
                    <IconQrcode stroke={2} size={32} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No hay clases programadas.</p>
              )}
              <p className="text-sm leading-6 text-slate-500">Recuerda validar tu asistencia al ingresar al aula asignada.</p>
            </section>

            <section className="p-4">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-blue-300">Mi horario</h2>
              <div className="mt-5 grid gap-6">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Clases de hoy</h3>
                    <span className="text-xs font-bold text-slate-500">{todayClasses.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {clasesLoading
                      ? <p className="text-sm text-slate-400">Cargando...</p>
                      : todayClasses.length > 0
                        ? todayClasses.map((item) => <ClassCard key={item.id} item={item} />)
                        : <p className="text-sm text-slate-400">No hay clases hoy.</p>
                    }
                  </div>
                </div>
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h3 className="text-sm font-bold text-slate-900">Resto de la semana</h3>
                    <span className="text-xs font-bold text-slate-500">{weekClasses.length}</span>
                  </div>
                  <div className="grid gap-3">
                    {clasesLoading
                      ? <p className="text-sm text-slate-400">Cargando...</p>
                      : weekClasses.map((item) => <ClassCard key={item.id} item={item} />)
                    }
                  </div>
                </div>
              </div>
            </section>

            <section className="p-4">
              <h2 className="text-2xl font-bold tracking-[-0.03em] text-blue-300">Últimas asistencias</h2>
              <div className="mt-4 grid gap-2">
                {statsLoading && <p className="text-sm text-slate-400">Cargando...</p>}
                {statsError  && <p className="text-sm text-rose-400">{statsError}</p>}
                {!statsLoading && !statsError && stats.ultimas.length === 0 && (
                  <p className="text-sm text-slate-400">Aún no tienes registros de asistencia.</p>
                )}
                {!statsLoading && !statsError && stats.ultimas.map((entry, index) => (
                  <article key={index} className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{entry.materia}</p>
                      <p className="text-xs text-slate-500">{entry.aula}</p>
                    </div>
                    <p className="text-xs font-medium text-slate-400">{entry.timestamp}</p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="p-4">
            <h2 className="text-2xl font-bold tracking-[-0.03em] text-blue-300">Reservar aula</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              Solicita un aula disponible para estudiar, reunirte con tu grupo o realizar una actividad académica.
            </p>

            <form className="mt-5 grid gap-4" onSubmit={handleReservation}>
              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Fecha
                <input type="date" value={reservationDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setReservationDate(e.target.value)} required
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none" />
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Hora de inicio
                <select value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} required
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none">
                  <option value="">Selecciona una hora</option>
                  {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00"].map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Duración
                <select value={duracion} onChange={(e) => setDuracion(Number(e.target.value))}
                  className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none">
                  <option value={1}>1 hora</option>
                  <option value={2}>2 horas</option>
                  <option value={3}>3 horas</option>
                </select>
              </label>

              <label className="grid gap-2 text-sm font-bold text-slate-700">
                Aula disponible
                {aulasLoading ? (
                  <p className="text-sm text-slate-400 py-2">Buscando aulas...</p>
                ) : !reservationDate || !reservationTime ? (
                  <p className="text-xs text-slate-400 py-2">Selecciona fecha y hora para ver aulas disponibles.</p>
                ) : aulasDisponibles.length === 0 ? (
                  <p className="text-xs text-rose-400 py-2">No hay aulas disponibles en ese horario.</p>
                ) : (
                  <select value={selectedRoom} onChange={(e) => setSelectedRoom(e.target.value)} required
                    className="w-full rounded border border-slate-200 bg-white px-3 py-3 text-slate-900 outline-none">
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
                <p className="text-sm text-rose-500 bg-rose-50 border border-rose-100 rounded px-3 py-2">{reservaError}</p>
              )}
              {successMessage && (
                <p className="text-sm text-green-700 bg-green-50 border border-green-100 rounded px-3 py-2">{successMessage}</p>
              )}

              <button type="submit" disabled={submitting || !selectedRoom}
                className="bg-blue-300 px-4 py-3 rounded font-bold text-white hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed">
                {submitting ? "Reservando..." : "Confirmar reserva"}
              </button>
            </form>

            <div className="mt-6">
              <h3 className="flex items-center justify-between border-b border-slate-200 pb-2 text-sm font-bold text-slate-900">
                Mis reservas activas
                <span>{misReservas.length}</span>
              </h3>
              <div className="mt-3 grid gap-3">
                {reservasLoading ? (
                  <p className="text-sm text-slate-400">Cargando...</p>
                ) : misReservas.length === 0 ? (
                  <p className="text-sm text-slate-400">No tienes reservas activas.</p>
                ) : (
                  misReservas.map((r) => (
                    <article key={r.id} className="p-3 rounded text-sm bg-orange-50 border border-orange-100 flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-slate-900">{r.aula}</p>
                        <p className="text-slate-500">{r.inicio} — {r.fin}</p>
                      </div>
                      <button onClick={() => handleCancelar(r.id)}
                        className="text-xs text-rose-500 font-bold hover:underline shrink-0">
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
