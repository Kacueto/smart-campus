import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { IconLogout2, IconUsers, IconBuilding, IconCalendar, IconShieldCheck, IconPlus, IconX, IconToggleLeft, IconToggleRight } from "@tabler/icons-react";
import { getAdminStats, getAdminUsuarios, crearAdminUsuario, toggleAdminUsuario, getAdminAulas, crearAdminAula, getAdminAccesos, getAdminHorarios } from "../services/api";
import Clock from "../components/Clock";

const TABS = ["Resumen", "Usuarios", "Aulas", "Horarios", "Accesos"];

const ROL_BADGE = {
  estudiante: "bg-st-1 text-st-3",
  docente: "bg-tc-1 text-tc-3",
  administrador: "bg-ad-1 text-ad-3",
};

function Badge({ text, className }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${className}`}>
      {text}
    </span>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-title/10 bg-white p-4">
      <p className="text-xs text-body">{label}</p>
      <p className="text-xl font-bold text-title">{value}</p>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-title/35 p-4">
      <div className="w-full max-w-md rounded-lg bg-bg">
        <div className="flex items-center justify-between border-b border-title/10 px-5 py-4">
          <h3 className="font-title text-2xl font-bold text-ad-3">{title}</h3>

          <button onClick={onClose} className="text-body">
            <IconX size={20} />
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function TabResumen({ stats, loading }) {
  if (loading) {
    return <p className="text-sm text-body/60">Cargando estadísticas...</p>;
  }

  if (!stats) {
    return (
      <p className="text-sm text-rose-400">
        No se pudieron cargar las estadísticas.
      </p>
    );
  }

  const rol = stats.usuarios_por_rol || {};

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Estudiantes" value={rol.estudiante?.total ?? 0} />
        <StatCard label="Docentes" value={rol.docente?.total ?? 0} />
        <StatCard label="Aulas activas" value={stats.total_aulas ?? 0} />
        <StatCard label="Total asistencias" value={stats.total_asistencias ?? 0} />
      </div>

      <div className="grid gap-3 grid-cols-2">
        <div className="rounded-lg border border-title/10 bg-white p-4">
          <p className="text-xs text-body">Accesos permitidos (24h)</p>
          <p className="mt-1 text-3xl font-bold text-title">
            {stats.accesos_hoy_permitidos ?? 0}
          </p>
        </div>

        <div className="rounded-lg border border-title/10 bg-white p-4">
          <p className="text-xs text-body">Accesos denegados (24h)</p>
          <p className="mt-1 text-3xl font-bold text-title">
            {stats.accesos_hoy_denegados ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

const FORM_USER_DEFAULT = {
  codigo: "",
  nombre: "",
  email: "",
  password: "",
  rol: "estudiante",
};

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_USER_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => {
    setLoading(true);

    getAdminUsuarios()
      .then(setUsuarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleToggle = async (id) => {
    try {
      const { activo } = await toggleAdminUsuario(id);

      setUsuarios((prev) =>
        prev.map((u) => (u.id === id ? { ...u, activo } : u))
      );
    } catch {}
  };

  const handleCrear = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await crearAdminUsuario(form);
      setShowModal(false);
      setForm(FORM_USER_DEFAULT);
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-body">{usuarios.length} usuarios en el sistema</p>

        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded bg-body px-3 py-2 text-sm font-bold text-bg">
          <IconPlus size={16} />
          Nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-body/60">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-title/10">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-xs font-bold text-body">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-title/10">
              {usuarios.map((u) => (
                <tr key={u.id} className="bg-white">
                  <td className="px-4 py-3 font-medium text-title">{u.nombre}</td>
                  <td className="px-4 py-3 font-mono text-body">{u.codigo}</td>
                  <td className="px-4 py-3 text-xs text-body/70">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge
                      text={u.rol}
                      className={ROL_BADGE[u.rol] || "bg-bg text-body"}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold ${
                        u.activo ? "text-title" : "text-body/50"
                      }`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggle(u.id)} className="text-body">
                      {u.activo ? (
                        <IconToggleRight size={22} className="text-ad-2" />
                      ) : (
                        <IconToggleLeft size={22} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title="Nuevo usuario"
          onClose={() => {
            setShowModal(false);
            setError(null);
            setForm(FORM_USER_DEFAULT);
          }}
        >
          <form onSubmit={handleCrear} className="grid gap-3">
            {[
              { label: "Código universitario", key: "codigo", type: "text" },
              { label: "Nombre completo", key: "nombre", type: "text" },
              { label: "Email", key: "email", type: "email" },
              { label: "Contraseña", key: "password", type: "password" },
            ].map(({ label, key, type }) => (
              <label key={key} className="grid gap-1 text-xs font-bold text-title">
                {label}
                <input
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="rounded border border-title/10 bg-white px-3 py-2 text-sm text-title outline-none focus:border-ad-2"
                />
              </label>
            ))}

            <label className="grid gap-1 text-xs font-bold text-title">
              Rol
              <select
                value={form.rol}
                onChange={(e) =>
                  setForm((f) => ({ ...f, rol: e.target.value }))
                }
                className="rounded border border-title/10 bg-white px-3 py-2 text-sm text-title outline-none focus:border-ad-2"
              >
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>

            {error && (
              <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded bg-title py-2.5 text-sm font-bold text-bg disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

const FORM_AULA_DEFAULT = {
  codigo: "",
  nombre: "",
  edificio: "",
  capacidad: 40,
};

function TabAulas() {
  const [aulas, setAulas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(FORM_AULA_DEFAULT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const cargar = () => {
    setLoading(true);

    getAdminAulas()
      .then(setAulas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
  }, []);

  const handleCrear = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError(null);

    try {
      await crearAdminAula({
        ...form,
        capacidad: Number(form.capacidad),
        edificio: form.edificio || null,
      });

      setShowModal(false);
      setForm(FORM_AULA_DEFAULT);
      cargar();
    } catch (err) {
      setError(err.response?.data?.detail || "Error al crear aula");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-body">{aulas.length} aulas en el sistema</p>

        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 rounded bg-body px-3 py-2 text-sm font-bold text-bg">
          <IconPlus size={16} />
          Nueva aula
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-body/60">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-title/10">
          <table className="w-full text-sm">
            <thead className="bg-white text-left text-xs font-bold text-body">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Edificio</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Horarios activos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-title/10">
              {aulas.map((a) => (
                <tr key={a.id} className="bg-white">
                  <td className="px-4 py-3 font-mono text-body">{a.codigo}</td>
                  <td className="px-4 py-3 font-medium text-title">{a.nombre}</td>
                  <td className="px-4 py-3 text-body">{a.edificio || "—"}</td>
                  <td className="px-4 py-3 text-body">{a.capacidad}</td>
                  <td className="px-4 py-3 text-body">{a.total_horarios}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`text-xs font-bold ${
                        a.activa ? "text-title" : "text-body/50"
                      }`}
                    >
                      {a.activa ? "Activa" : "Inactiva"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title="Nueva aula"
          onClose={() => {
            setShowModal(false);
            setError(null);
            setForm(FORM_AULA_DEFAULT);
          }}
        >
          <form onSubmit={handleCrear} className="grid gap-3">
            {[
              { label: "Código (ej: LAB-401)", key: "codigo", type: "text" },
              { label: "Nombre", key: "nombre", type: "text" },
              { label: "Edificio", key: "edificio", type: "text" },
            ].map(({ label, key, type }) => (
              <label key={key} className="grid gap-1 text-xs font-bold text-title">
                {label}
                <input
                  type={type}
                  value={form[key]}
                  required={key !== "edificio"}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [key]: e.target.value }))
                  }
                  className="rounded border border-title/10 bg-white px-3 py-2 text-sm text-title outline-none focus:border-ad-2"
                />
              </label>
            ))}

            <label className="grid gap-1 text-xs font-bold text-title">
              Capacidad
              <input
                type="number"
                min={1}
                max={500}
                required
                value={form.capacidad}
                onChange={(e) =>
                  setForm((f) => ({ ...f, capacidad: e.target.value }))
                }
                className="rounded border border-title/10 bg-white px-3 py-2 text-sm text-title outline-none focus:border-ad-2"
              />
            </label>

            {error && (
              <p className="rounded bg-rose-50 px-3 py-2 text-xs text-rose-500">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded bg-title py-2.5 text-sm font-bold text-bg disabled:opacity-50"
            >
              {saving ? "Creando..." : "Crear aula"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function AdminTable({ children, minWidth = "min-w-[760px]" }) {
  return (
    <div className="w-full min-w-0 overflow-hidden rounded-lg border border-title/10 bg-white">
      <div className="w-full min-w-0 overflow-x-auto">
        <table className={`${minWidth} w-full text-sm`}>{children}</table>
      </div>
    </div>
  );
}

function TabHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminHorarios()
      .then(setHorarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-body/60">Cargando...</p>;

  return (
    <AdminTable minWidth="min-w-[860px]">
      <thead className="bg-white text-left text-xs font-bold text-body">
        <tr>
          <th className="px-4 py-3">Materia</th>
          <th className="px-4 py-3">Día</th>
          <th className="px-4 py-3">Horario</th>
          <th className="px-4 py-3">Aula</th>
          <th className="px-4 py-3">Docente</th>
          <th className="px-4 py-3">Inscritos</th>
          <th className="px-4 py-3">Estado</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-title/10">
        {horarios.map((h) => (
          <tr key={h.id} className="bg-white">
            <td className="px-4 py-3 font-medium text-title">{h.materia}</td>
            <td className="px-4 py-3 text-body">{h.dia}</td>
            <td className="px-4 py-3 font-mono text-xs text-body">{h.horario}</td>
            <td className="px-4 py-3 text-xs text-body">{h.aula}</td>
            <td className="px-4 py-3 text-xs text-body">{h.docente}</td>
            <td className="px-4 py-3 text-center text-body">{h.total_inscritos}</td>
            <td className="px-4 py-3">
              <span className={`text-xs font-bold ${h.activo ? "text-title" : "text-body/50"}`}>
                {h.activo ? "Activo" : "Inactivo"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </AdminTable>
  );
}

function TabAccesos() {
  const [accesos, setAccesos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAccesos(100)
      .then(setAccesos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-body/60">Cargando...</p>;

  return (
    <AdminTable minWidth="min-w-[980px]">
      <thead className="bg-white text-left text-xs font-bold text-body">
        <tr>
          <th className="px-4 py-3">Fecha/Hora</th>
          <th className="px-4 py-3">Evento</th>
          <th className="px-4 py-3">Usuario</th>
          <th className="px-4 py-3">Rol</th>
          <th className="px-4 py-3">Aula</th>
          <th className="px-4 py-3">Motivo</th>
          <th className="px-4 py-3">IP Edge</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-title/10">
        {accesos.map((a) => (
          <tr
            key={a.id}
            className={a.evento === "denegado" ? "bg-rose-50/40" : "bg-white"}
          >
            <td className="px-4 py-3 font-mono text-xs text-body">
              {a.timestamp}
            </td>

            <td className="px-4 py-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold ${
                  a.evento === "permitido"
                    ? "bg-bg text-title"
                    : "bg-rose-100 text-rose-700"
                }`}
              >
                {a.evento}
              </span>
            </td>

            <td className="px-4 py-3">
              <p className="font-medium text-title">{a.user_nombre}</p>
              <p className="font-mono text-xs text-body/70">{a.user_codigo}</p>
            </td>

            <td className="px-4 py-3">
              <Badge
                text={a.user_rol}
                className={ROL_BADGE[a.user_rol] || "bg-bg text-body"}
              />
            </td>

            <td className="px-4 py-3 text-xs text-body">
              <p className="font-medium">{a.aula_nombre}</p>
              <p className="font-mono text-body/70">{a.aula_codigo}</p>
            </td>

            <td className="px-4 py-3 text-xs text-body/70">{a.motivo || "—"}</td>
            <td className="px-4 py-3 font-mono text-xs text-body/70">
              {a.ip_edge || "—"}
            </td>
          </tr>
        ))}

        {accesos.length === 0 && (
          <tr>
            <td colSpan={7} className="px-4 py-8 text-center text-sm text-body/60">
              No hay eventos de acceso registrados.
            </td>
          </tr>
        )}
      </tbody>
    </AdminTable>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  }, []);

  const [activeTab, setActiveTab] = useState("Resumen");
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authUser");
    localStorage.removeItem("token");
    navigate("/");
  };

  if (!authUser || authUser.role !== "administrador") {
    return <Navigate to="/" replace />;
  }

  const TAB_ICONS = {
    Resumen: <IconShieldCheck size={16} />,
    Usuarios: <IconUsers size={16} />,
    Aulas: <IconBuilding size={16} />,
    Horarios: <IconCalendar size={16} />,
    Accesos: <IconShieldCheck size={16} />,
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

      <section className="mx-auto grid w-full max-w-7xl min-w-0 gap-4 p-4 sm:p-6">
        <p className="font-title text-5xl font-bold text-title">
          Hola, {authUser.nombre}
        </p>


        <nav className="flex gap-1 overflow-x-auto border-b border-title/10">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-bold ${
                activeTab === tab
                  ? "bg-title text-white rounded-lg"
                  : "border-transparent text-body"
              }`}
            >
              {TAB_ICONS[tab]}
              {tab}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {activeTab === "Resumen" && (
            <TabResumen stats={stats} loading={statsLoading} />
          )}
          {activeTab === "Usuarios" && <TabUsuarios />}
          {activeTab === "Aulas" && <TabAulas />}
          {activeTab === "Horarios" && <TabHorarios />}
          {activeTab === "Accesos" && <TabAccesos />}
        </div>
      </section>
    </main>
  );
}
