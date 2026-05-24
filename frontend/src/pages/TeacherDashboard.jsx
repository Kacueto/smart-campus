import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode, IconClock, IconUsers, IconRefresh, IconCopy, IconCheck } from "@tabler/icons-react";
import { QRCode } from "react-qr-code";
import { getMisClasesHoy, getTodasMisClases, generarQRProfesor, getAsistenciaSesion } from "../services/api";
import Clock from "../components/Clock";

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  // ── Clases ─────────────────────────────────────────────────────────────────
  const [clasesHoy, setClasesHoy]         = useState([]);
  const [todasClases, setTodasClases]     = useState([]);
  const [clasesLoading, setClasesLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMisClasesHoy(), getTodasMisClases()])
      .then(([hoy, todas]) => { setClasesHoy(hoy); setTodasClases(todas); })
      .catch(console.error)
      .finally(() => setClasesLoading(false));
  }, []);

  // ── Sesión activa ──────────────────────────────────────────────────────────
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [minutos, setMinutos]                     = useState(10);
  const [sesionActiva, setSesionActiva]           = useState(false);
  const [qrToken, setQrToken]                     = useState(null);
  const [tiempoRestante, setTiempoRestante]       = useState(0);
  const [asistentes, setAsistentes]               = useState([]);
  const [qrExpira, setQrExpira]                   = useState(30);

  const timerRef    = useRef(null);
  const qrTimerRef  = useRef(null);
  const pollRef     = useRef(null);

  const [sesionError, setSesionError] = useState(null);
  const [copiado, setCopiado] = useState(false);

  const copiarToken = () => {
    navigator.clipboard.writeText(qrToken);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Iniciar sesión
  const iniciarSesion = async () => {
    if (!claseSeleccionada) return;
    setSesionError(null);
    try {
      const data = await generarQRProfesor(claseSeleccionada.aula_id, minutos, claseSeleccionada.id);
      setQrToken(data.qr_token);
      setSesionActiva(true);
      setTiempoRestante(minutos * 60);
      setQrExpira(30);
      setAsistentes([]);
    } catch (err) {
      const msg = err.response?.data?.detail || "No se pudo iniciar la sesión.";
      setSesionError(msg);
    }
  };

  // Refrescar QR cada 30s
  useEffect(() => {
    if (!sesionActiva || !claseSeleccionada) return;

    qrTimerRef.current = setInterval(async () => {
      try {
        const data = await generarQRProfesor(claseSeleccionada.aula_id, minutos, claseSeleccionada.id);
        setQrToken(data.qr_token);
        setQrExpira(30);
      } catch {}
    }, 30000);

    return () => clearInterval(qrTimerRef.current);
  }, [sesionActiva, claseSeleccionada]);

  // Countdown QR expira
  useEffect(() => {
    if (!sesionActiva) return;
    const interval = setInterval(() => {
      setQrExpira((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);
    return () => clearInterval(interval);
  }, [sesionActiva]);

  // Countdown sesión
  useEffect(() => {
    if (!sesionActiva) return;
    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          cerrarSesion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sesionActiva]);

  // Polling asistencia cada 5s
  useEffect(() => {
    if (!sesionActiva || !claseSeleccionada) return;
    const fetch = async () => {
      try {
        const data = await getAsistenciaSesion(claseSeleccionada.id);
        setAsistentes(data);
      } catch {}
    };
    fetch();
    pollRef.current = setInterval(fetch, 5000);
    return () => clearInterval(pollRef.current);
  }, [sesionActiva, claseSeleccionada]);

  const cerrarSesion = () => {
    setSesionActiva(false);
    setQrToken(null);
    setTiempoRestante(0);
    clearInterval(timerRef.current);
    clearInterval(qrTimerRef.current);
    clearInterval(pollRef.current);
  };

  const formatTiempo = (seg) => {
    const m = Math.floor(seg / 60).toString().padStart(2, "0");
    const s = (seg % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/login/profesor");
  };

  if (!authUser || authUser.role !== "docente") {
    return <Navigate to="/login/profesor" replace />;
  }

  const dias = {1:"Lunes",2:"Martes",3:"Miércoles",4:"Jueves",5:"Viernes",6:"Sábado",7:"Domingo"};

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

      <section className="mx-auto max-w-7xl p-4 sm:p-6 grid gap-6">

        {/* Bienvenida */}
        <div>
          <p className="text-3xl font-bold text-orange-300">Hola, {authUser.nombre}</p>
          <p className="text-sm text-slate-500">Panel de control de asistencia</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="grid gap-6">

            {/* Clases de hoy */}
            <section>
              <h2 className="text-2xl font-bold text-orange-300 mb-4">Clases de hoy</h2>
              {clasesLoading ? (
                <p className="text-sm text-slate-400">Cargando...</p>
              ) : clasesHoy.length === 0 ? (
                <p className="text-sm text-slate-400">No tienes clases hoy.</p>
              ) : (
                <div className="grid gap-3">
                  {clasesHoy.map((clase) => (
                    <article
                      key={clase.id}
                      onClick={() => !sesionActiva && setClaseSeleccionada(clase)}
                      className={`border rounded p-4 cursor-pointer transition ${
                        claseSeleccionada?.id === clase.id
                          ? "border-orange-400 bg-orange-50"
                          : "border-slate-200 bg-white hover:border-orange-200"
                      } ${sesionActiva && claseSeleccionada?.id !== clase.id ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-900">{clase.materia}</h3>
                          <p className="text-sm text-slate-500 mt-1">{clase.aula}</p>
                          <p className="text-sm text-slate-500">{clase.horario}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded">
                            <IconUsers size={12} className="inline mr-1" />
                            {clase.total_estudiantes} estudiantes
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Todas las clases */}
            <section>
              <h2 className="text-2xl font-bold text-orange-300 mb-4">Todas mis clases</h2>
              {clasesLoading ? (
                <p className="text-sm text-slate-400">Cargando...</p>
              ) : (
                <div className="grid gap-2">
                  {todasClases.map((clase) => (
                    <article key={clase.id} className="border border-slate-200 bg-white rounded p-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{clase.materia}</p>
                        <p className="text-xs text-slate-500">{dias[clase.dia_semana]} · {clase.horario} · {clase.aula}</p>
                      </div>
                      <span className="text-xs text-slate-400">{clase.total_estudiantes} est.</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Panel de sesión */}
          <aside className="grid gap-4 self-start">

            {/* Config de minutos */}
            <section className="border border-slate-200 bg-white rounded p-4 grid gap-4">
              <h2 className="text-xl font-bold text-orange-300">Configurar sesión</h2>

              {!claseSeleccionada ? (
                <p className="text-sm text-slate-400">Selecciona una clase de hoy para iniciar.</p>
              ) : (
                <>
                  <div className="bg-orange-50 border border-orange-200 rounded p-3">
                    <p className="text-xs text-slate-500">Clase seleccionada</p>
                    <p className="font-bold text-slate-900">{claseSeleccionada.materia}</p>
                    <p className="text-xs text-slate-500">{claseSeleccionada.aula}</p>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-slate-700">
                    Minutos de asistencia (5 - 15)
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5} max={15} step={1}
                        value={minutos}
                        disabled={sesionActiva}
                        onChange={(e) => setMinutos(Number(e.target.value))}
                        className="flex-1 accent-orange-400"
                      />
                      <span className="text-xl font-bold text-orange-400 w-8 text-center">{minutos}</span>
                    </div>
                  </label>

                  {sesionError && (
                    <p className="text-sm font-semibold text-rose-500 bg-rose-50 border border-rose-100 rounded px-3 py-2">
                      ⚠️ {sesionError}
                    </p>
                  )}

                  {!sesionActiva ? (
                    <button
                      onClick={iniciarSesion}
                      className="w-full bg-orange-300 hover:bg-orange-400 text-white font-bold py-3 rounded transition flex items-center justify-center gap-2"
                    >
                      <IconQrcode size={20} />
                      Iniciar sesión y generar QR
                    </button>
                  ) : (
                    <button
                      onClick={cerrarSesion}
                      className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded transition"
                    >
                      Cerrar sesión anticipadamente
                    </button>
                  )}
                </>
              )}
            </section>

            {/* QR activo */}
            {sesionActiva && qrToken && (
              <section className="border border-orange-300 bg-white rounded p-4 grid gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-orange-300">QR activo</h2>
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
                    <IconClock size={16} />
                    Sesión: {formatTiempo(tiempoRestante)}
                  </div>
                </div>

                <div className="flex justify-center p-4 bg-white border border-slate-100 rounded">
                  <QRCode value={qrToken} size={180} />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <IconRefresh size={12} />
                    QR expira en {qrExpira}s
                  </span>
                  <span className="text-green-600 font-bold">● Puerta abierta</span>
                </div>

                <button
                  onClick={copiarToken}
                  className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded py-2 text-sm font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  {copiado ? <IconCheck size={15} className="text-green-500" /> : <IconCopy size={15} />}
                  {copiado ? "Token copiado" : "Copiar token"}
                </button>
              </section>
            )}

            {/* Asistencia en tiempo real */}
            {sesionActiva && (
              <section className="border border-slate-200 bg-white rounded p-4 grid gap-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-orange-300">Asistencia</h2>
                  <span className="text-sm font-bold text-slate-500">{asistentes.length} / {claseSeleccionada?.total_estudiantes}</span>
                </div>

                {asistentes.length === 0 ? (
                  <p className="text-sm text-slate-400">Esperando estudiantes...</p>
                ) : (
                  <div className="grid gap-2">
                    {asistentes.map((a, i) => (
                      <div key={i} className="flex items-center justify-between rounded bg-green-50 border border-green-100 px-3 py-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{a.nombre}</p>
                          <p className="text-xs text-slate-500">{a.codigo}</p>
                        </div>
                        <p className="text-xs font-medium text-green-600">{a.hora}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
