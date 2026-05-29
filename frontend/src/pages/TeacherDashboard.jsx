import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconQrcode, IconClock, IconUsers, IconRefresh, IconCopy, IconCheck, IconChevronLeft, IconChevronRight, IconList, IconCircleCheck, IconCircle } from "@tabler/icons-react";
import { QRCode } from "react-qr-code";
import { getMisClasesHoy, getTodasMisClases, generarQRProfesor, cerrarSesionProfesor, getListaClase } from "../services/api";
import Clock from "../components/Clock";

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

export default function TeacherDashboard() {
  const ITEMS_PER_PAGE = 5;
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const storedUser = localStorage.getItem("authUser");
    return storedUser ? JSON.parse(storedUser) : null;
  }, []);

  const [clasesHoy, setClasesHoy] = useState([]);
  const [todasClases, setTodasClases] = useState([]);
  const [clasesLoading, setClasesLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMisClasesHoy(), getTodasMisClases()])
      .then(([hoy, todas]) => {
        setClasesHoy(hoy);
        setTodasClases(todas);
      })
      .catch(console.error)
      .finally(() => setClasesLoading(false));
  }, []);

  const SESION_KEY = "teacherSession";

  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [minutos, setMinutos] = useState(10);
  const [sesionActiva, setSesionActiva] = useState(false);      // puerta abierta
  const [asistenciaActiva, setAsistenciaActiva] = useState(false); // ventana de asistencia
  const [qrToken, setQrToken] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [asistentes, setAsistentes] = useState([]);
  const [qrExpira, setQrExpira] = useState(30);
  const [toast, setToast] = useState(null);

  // Restaurar sesión activa si el profesor cerró sesión de cuenta y volvió a entrar
  useEffect(() => {
    const saved = localStorage.getItem(SESION_KEY);
    if (!saved) return;

    const { claseSeleccionada: clase, minutos: min, startedAt, duracionMs } = JSON.parse(saved);

    // Verificar si la clase ya terminó
    const [h, m] = clase.hora_fin.split(":").map(Number);
    const finClase = new Date();
    finClase.setHours(h, m, 0, 0);
    if (Date.now() >= finClase.getTime()) {
      localStorage.removeItem(SESION_KEY);
      return;
    }

    const remaining = Math.floor((duracionMs - (Date.now() - startedAt)) / 1000);
    const conAsistencia = remaining > 0;

    setClaseSeleccionada(clase);
    setMinutos(min);
    setSesionActiva(true);
    setAsistenciaActiva(conAsistencia);
    if (conAsistencia) setTiempoRestante(remaining);

    generarQRProfesor(clase.aula_id, min, clase.id)
      .then((data) => { setQrToken(data.qr_token); setQrExpira(30); })
      .catch(() => { localStorage.removeItem(SESION_KEY); setSesionActiva(false); setAsistenciaActiva(false); });
  }, []);

  const [allClassesPage, setAllClassesPage] = useState(1);

  const timerRef = useRef(null);
  const qrTimerRef = useRef(null);
  const pollRef = useRef(null);

  const [sesionError, setSesionError] = useState(null);

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const showToast = (asistente) => {
    setToast(asistente);
    setTimeout(() => setToast(null), 3000);
  };
  const [copiado, setCopiado] = useState(false);
  const [vistaLista, setVistaLista] = useState(false);
  const [listaClase, setListaClase] = useState([]);

  const copiarToken = () => {
    navigator.clipboard.writeText(qrToken);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const iniciarSesion = async () => {
    if (!claseSeleccionada) return;

    setSesionError(null);

    try {
      const data = await generarQRProfesor(
        claseSeleccionada.aula_id,
        minutos,
        claseSeleccionada.id
      );

      localStorage.setItem(SESION_KEY, JSON.stringify({
        claseSeleccionada,
        minutos,
        startedAt: Date.now(),
        duracionMs: minutos * 60 * 1000,
      }));

      setQrToken(data.qr_token);
      setSesionActiva(true);
      setAsistenciaActiva(true);
      setTiempoRestante(minutos * 60);
      setQrExpira(30);
      setAsistentes([]);
    } catch (err) {
      const msg = err.response?.data?.detail || "No se pudo iniciar la sesión.";
      setSesionError(msg);
    }
  };

  useEffect(() => {
    if (!sesionActiva || !claseSeleccionada) return;

    qrTimerRef.current = setInterval(async () => {
      try {
        const data = await generarQRProfesor(
          claseSeleccionada.aula_id,
          minutos,
          claseSeleccionada.id
        );

        setQrToken(data.qr_token);
        setQrExpira(30);
      } catch {}
    }, 30000);

    return () => clearInterval(qrTimerRef.current);
  }, [sesionActiva, claseSeleccionada, minutos]);

  useEffect(() => {
    if (!sesionActiva) return;

    const interval = setInterval(() => {
      setQrExpira((prev) => (prev > 0 ? prev - 1 : 30));
    }, 1000);

    return () => clearInterval(interval);
  }, [sesionActiva]);

  useEffect(() => {
    if (!asistenciaActiva) return;

    timerRef.current = setInterval(() => {
      setTiempoRestante((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setAsistenciaActiva(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [asistenciaActiva]);

  // Auto-cerrar puerta cuando termina la clase
  useEffect(() => {
    if (!sesionActiva || !claseSeleccionada) return;

    const checkFin = () => {
      const [h, m] = claseSeleccionada.hora_fin.split(":").map(Number);
      const fin = new Date();
      fin.setHours(h, m, 0, 0);
      if (Date.now() >= fin.getTime()) cerrarPuerta();
    };

    checkFin();
    const interval = setInterval(checkFin, 30000);
    return () => clearInterval(interval);
  }, [sesionActiva, claseSeleccionada]);

  useEffect(() => {
    if (!sesionActiva || !claseSeleccionada) return;

    const ws = new WebSocket(`ws://localhost:8000/ws/asistencia-sesion/${claseSeleccionada.id}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "init") {
        setAsistentes(data.asistentes);
      } else if (data.type === "new") {
        setAsistentes((prev) => [data.asistente, ...prev]);
        playBeep();
        showToast(data.asistente);
      }
    };

    ws.onerror = () => {};

    pollRef.current = ws;
    return () => ws.close();
  }, [sesionActiva, claseSeleccionada]);

  const cerrarPuerta = () => {
    localStorage.removeItem(SESION_KEY);
    if (claseSeleccionada?.aula_id) {
      cerrarSesionProfesor(claseSeleccionada.aula_id).catch(() => {});
    }
    setSesionActiva(false);
    setAsistenciaActiva(false);
    setQrToken(null);
    setTiempoRestante(0);

    clearInterval(timerRef.current);
    clearInterval(qrTimerRef.current);
    pollRef.current?.close?.();
    pollRef.current = null;
  };

  const formatTiempo = (seg) => {
    const m = Math.floor(seg / 60).toString().padStart(2, "0");
    const s = (seg % 60).toString().padStart(2, "0");

    return `${m}:${s}`;
  };

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!authUser || authUser.role !== "docente") {
    return <Navigate to="/" replace />;
  }

  const dias = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes",
    6: "Sábado",
    7: "Domingo",
  };

  const allClassesTotalPages = Math.ceil(todasClases.length / ITEMS_PER_PAGE);

  const paginatedAllClasses = todasClases.slice(
    (allClassesPage - 1) * ITEMS_PER_PAGE,
    allClassesPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setAllClassesPage(1);
  }, [todasClases]);

  useEffect(() => {
    if (vistaLista && claseSeleccionada) {
      getListaClase(claseSeleccionada.id)
        .then((d) => setListaClase(Array.isArray(d) ? d : []))
        .catch(() => setListaClase([]));
    }
  }, [vistaLista, claseSeleccionada, asistentes]);

  return (
    <main className="min-h-screen bg-bg font-body text-body">
      <header className="border-b border-title/10 bg-bg px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Clock />
          <button onClick={handleLogout} className="flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-[#FD7878]">
            <IconLogout2 size={24} />
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-6">
        <p className="font-title text-5xl font-bold text-tc-2">
          Hola, {authUser.nombre}
        </p>

        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <div className="grid gap-6">
            <section>
              <h2 className="font-title text-3xl font-bold text-tc-2">
                Clases de hoy
              </h2>

              {clasesLoading ? (
                <p className="text-sm text-body/60">Cargando...</p>
              ) : clasesHoy.length === 0 ? (
                <p className="text-sm text-body/60">No tienes clases hoy.</p>
              ) : (
                <div className="grid gap-3">
                  {clasesHoy.map((clase) => (
                    <article
                      key={clase.id}
                      onClick={() =>
                        !sesionActiva && setClaseSeleccionada(clase)
                      }
                      className={`rounded-lg border p-4 ${
                        claseSeleccionada?.id === clase.id
                          ? "border-tc-2 bg-tc-1/45"
                          : "border-title/10 bg-white"
                      } ${
                        sesionActiva && claseSeleccionada?.id !== clase.id
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-title">
                            {clase.materia}
                          </h3>

                          <p className="mt-1 text-sm text-body">
                            {clase.aula}
                          </p>

                          <p className="text-sm text-body">
                            {clase.horario}
                          </p>
                        </div>

                        <div className="text-right">
                          <span className="rounded bg-bg px-2 py-1 text-xs font-bold text-body ring-1 ring-title/10">
                            <IconUsers size={12} className="mr-1 inline" />
                            {clase.total_estudiantes} estudiantes
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="font-title text-3xl font-bold text-tc-2">
                Todas mis clases
              </h2>

              {clasesLoading ? (
                <p className="text-sm text-body/60">Cargando...</p>
              ) : todasClases.length === 0 ? (
                <p className="text-sm text-body/60">No tienes clases registradas.</p>
              ) : (
                <>
                  <div className="grid gap-2">
                    {paginatedAllClasses.map((clase) => (
                      <article
                        key={clase.id}
                        className="flex flex-col justify-between gap-1 rounded-lg border border-title/10 bg-white p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-title">
                            {clase.materia}
                          </p>

                          <span className="flex items-center gap-1 text-body">
                            <IconUsers size={16} />
                            {clase.total_estudiantes}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-body">
                            {dias[clase.dia_semana]} {clase.horario}
                          </p>

                          <p className="text-xs text-body">{clase.aula}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <PaginationControls
                    page={allClassesPage}
                    totalPages={allClassesTotalPages}
                    onPageChange={setAllClassesPage}
                  />
                </>
              )}
            </section>
          </div>

          <aside className="grid self-start">
              <h2 className="font-title text-3xl font-bold text-tc-2">
                Configurar sesión
              </h2>
            <section className="grid gap-4 rounded-lg border border-title/10 bg-white p-4">

              {!claseSeleccionada ? (
                <p className="text-sm text-body/60">
                  Selecciona una clase de hoy para iniciar.
                </p>
              ) : (
                <>
                  <div className="rounded-lg border border-title/10 bg-bg p-3">
                    <p className="text-xs text-body">Clase seleccionada</p>

                    <p className="font-bold text-title">
                      {claseSeleccionada.materia}
                    </p>

                    <p className="text-xs text-body">
                      {claseSeleccionada.aula}
                    </p>
                  </div>

                  <label className="grid gap-2 text-sm font-bold text-title">
                    Minutos de asistencia (5 - 15)

                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={5}
                        max={15}
                        step={1}
                        value={minutos}
                        disabled={sesionActiva}
                        onChange={(e) => setMinutos(Number(e.target.value))}
                        className="flex-1 accent-tc-2"
                      />

                      <span className="w-8 text-center text-xl font-bold text-tc-2">
                        {minutos}
                      </span>
                    </div>
                  </label>

                  {sesionError && (
                    <p className="rounded border border-rose-100 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-500">
                      ⚠️ {sesionError}
                    </p>
                  )}

                  {!sesionActiva ? (
                    <button
                      onClick={iniciarSesion}
                      className="flex w-full items-center justify-center gap-2 rounded bg-title py-3 font-bold text-bg"
                    >
                      <IconQrcode size={20} />
                      Iniciar sesión y generar QR
                    </button>
                  ) : (
                    <>
                      {!asistenciaActiva && (
                        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
                          ● Puerta abierta hasta las {claseSeleccionada?.hora_fin}
                        </p>
                      )}
                      <button
                        onClick={cerrarPuerta}
                        className="w-full rounded bg-rose-500 py-3 font-bold text-white"
                      >
                        Cerrar puerta anticipadamente
                      </button>
                    </>
                  )}
                </>
              )}
            </section>

            {sesionActiva && qrToken && (
              <section className="grid gap-4 rounded-lg border border-tc-2/30 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-title text-3xl font-bold text-tc-2">
                    QR activo
                  </h2>

                  {asistenciaActiva ? (
                    <div className="flex items-center gap-2 text-sm font-bold text-body">
                      <IconClock size={16} />
                      Asistencia: {formatTiempo(tiempoRestante)}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-green-600">
                      ● Solo acceso
                    </span>
                  )}
                </div>

                <div className="flex justify-center rounded-lg border border-title/10 bg-white p-4">
                  <QRCode value={qrToken} size={180} />
                </div>

                <div className="flex items-center justify-between text-xs text-body/70">
                  <span className="flex items-center gap-1">
                    <IconRefresh size={12} />
                    QR expira en {qrExpira}s
                  </span>

                  <span className="font-bold text-title">
                    ● Puerta abierta
                  </span>
                </div>

                <button
                  onClick={copiarToken}
                  className="flex w-full items-center justify-center gap-2 rounded border border-title/10 py-2 text-sm font-bold text-body"
                >
                  {copiado ? (
                    <IconCheck size={15} className="text-tc-2" />
                  ) : (
                    <IconCopy size={15} />
                  )}

                  {copiado ? "Token copiado" : "Copiar token"}
                </button>
              </section>
            )}

            {sesionActiva && (
              <section className="grid gap-3 rounded-lg border border-title/10 bg-white p-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-title text-3xl font-bold text-tc-2">
                    {vistaLista ? "Lista" : asistenciaActiva ? "Asistencia" : "Entradas"}
                  </h2>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-body">
                      {asistentes.length} / {claseSeleccionada?.total_estudiantes}
                    </span>
                    <button
                      onClick={() => setVistaLista((v) => !v)}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition-colors ${
                        vistaLista
                          ? "border-orange-300 bg-orange-50 text-orange-500"
                          : "border-title/10 text-body hover:bg-bg"
                      }`}
                    >
                      {vistaLista ? <IconUsers size={14} /> : <IconList size={14} />}
                      {vistaLista ? "En vivo" : "Lista"}
                    </button>
                  </div>
                </div>

                {vistaLista ? (
                  listaClase.length === 0 ? (
                    <p className="text-sm text-body/60">Cargando lista...</p>
                  ) : (
                    <div className="grid gap-1.5 max-h-96 overflow-y-auto">
                      {listaClase.map((e, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                            e.asistio
                              ? "border-green-200 bg-green-50"
                              : "border-title/10 bg-bg"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {e.asistio ? (
                              <IconCircleCheck size={16} className="text-green-600 shrink-0" />
                            ) : (
                              <IconCircle size={16} className="text-body/30 shrink-0" />
                            )}
                            <div>
                              <p className="text-sm font-bold text-title">{e.nombre}</p>
                              <p className="text-xs text-body">{e.codigo}</p>
                            </div>
                          </div>
                          {e.hora && (
                            <p className="text-xs font-medium text-green-600">{e.hora}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : asistentes.length === 0 ? (
                  <p className="text-sm text-body/60">Esperando estudiantes...</p>
                ) : (
                  <div className="grid gap-2">
                    {asistentes.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-title/10 bg-bg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-bold text-title">{a.nombre}</p>
                          <p className="text-xs text-body">{a.codigo}</p>
                        </div>
                        <p className="text-xs font-medium text-body">{a.hora}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </aside>
        </div>
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-5 py-3 shadow-lg">
          <span className="text-lg">✓</span>
          <div>
            <p className="text-sm font-bold text-green-800">{toast.nombre}</p>
            <p className="text-xs text-green-600">{toast.codigo} · {toast.hora}</p>
          </div>
        </div>
      )}
    </main>
  );
}
