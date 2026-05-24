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

  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [minutos, setMinutos] = useState(10);
  const [sesionActiva, setSesionActiva] = useState(false);
  const [qrToken, setQrToken] = useState(null);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [asistentes, setAsistentes] = useState([]);
  const [qrExpira, setQrExpira] = useState(30);

  const timerRef = useRef(null);
  const qrTimerRef = useRef(null);
  const pollRef = useRef(null);

  const [sesionError, setSesionError] = useState(null);
  const [copiado, setCopiado] = useState(false);

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
              ) : (
                <div className="grid gap-2">
                  {todasClases.map((clase) => (
                    <article key={clase.id} className="flex flex-col justify-between gap-1 rounded-lg border border-title/10 bg-white p-3">
                      <div className="flex items- justify-between gap-2">
                        <p className="text-sm font-bold text-title">
                          {clase.materia}
                        </p>
                        <span className="text-body flex items-center gap-1">
                          <IconUsers size={16} />
                          {clase.total_estudiantes}
                        </span>

                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-body">
                          {dias[clase.dia_semana]} {clase.horario}
                        </p>
                        <p className="text-xs text-body">
                          {clase.aula}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
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
                    <button
                      onClick={cerrarSesion}
                      className="w-full rounded bg-rose-500 py-3 font-bold text-white"
                    >
                      Cerrar sesión anticipadamente
                    </button>
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

                  <div className="flex items-center gap-2 text-sm font-bold text-body">
                    <IconClock size={16} />
                    Sesión: {formatTiempo(tiempoRestante)}
                  </div>
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
                    Asistencia
                  </h2>

                  <span className="text-sm font-bold text-body">
                    {asistentes.length} /{" "}
                    {claseSeleccionada?.total_estudiantes}
                  </span>
                </div>

                {asistentes.length === 0 ? (
                  <p className="text-sm text-body/60">
                    Esperando estudiantes...
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {asistentes.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-title/10 bg-bg px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-bold text-title">
                            {a.nombre}
                          </p>

                          <p className="text-xs text-body">{a.codigo}</p>
                        </div>

                        <p className="text-xs font-medium text-body">
                          {a.hora}
                        </p>
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
