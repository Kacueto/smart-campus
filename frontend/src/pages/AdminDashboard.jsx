import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  IconLogout2, IconUsers, IconBuilding, IconCalendar,
  IconShieldCheck, IconPlus, IconX, IconToggleLeft, IconToggleRight,
} from "@tabler/icons-react";
import {
  getAdminStats, getAdminUsuarios, crearAdminUsuario, toggleAdminUsuario,
  getAdminAulas, crearAdminAula, getAdminAccesos, getAdminHorarios,
} from "../services/api";
import Clock from "../components/Clock";

const TABS = ["Resumen", "Usuarios", "Aulas", "Horarios", "Accesos"];

const ROL_BADGE = {
  estudiante:     "bg-blue-100 text-blue-700",
  docente:        "bg-purple-100 text-purple-700",
  administrador:  "bg-orange-100 text-orange-700",
};

function Badge({ text, className }) {
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-bold ${className}`}>
      {text}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {/* {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}*/}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <IconX size={20} />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ── Tab: Resumen ──────────────────────────────────────────────────────────────

function TabResumen({ stats, loading }) {
  if (loading) return <p className="text-sm text-slate-400">Cargando estadísticas...</p>;
  if (!stats)  return <p className="text-sm text-rose-400">No se pudieron cargar las estadísticas.</p>;

  const rol = stats.usuarios_por_rol || {};

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Estudiantes"
          value={rol.estudiante?.total ?? 0}
          sub={`${rol.estudiante?.activos ?? 0} activos`}
        />
        <StatCard
          label="Docentes"
          value={rol.docente?.total ?? 0}
          sub={`${rol.docente?.activos ?? 0} activos`}
        />
        <StatCard
          label="Aulas activas"
          value={stats.total_aulas ?? 0}
        />
        <StatCard
          label="Total asistencias"
          value={stats.total_asistencias ?? 0}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded border border-green-200 bg-green-50 p-4">
          <p className="text-xs text-slate-500">Accesos permitidos (24h)</p>
          <p className="mt-1 text-3xl font-bold text-green-700">
            {stats.accesos_hoy_permitidos ?? 0}
          </p>
        </div>
        <div className="rounded border border-rose-200 bg-rose-50 p-4">
          <p className="text-xs text-slate-500">Accesos denegados (24h)</p>
          <p className="mt-1 text-3xl font-bold text-rose-600">
            {stats.accesos_hoy_denegados ?? 0}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────────────────────

const FORM_USER_DEFAULT = { codigo: "", nombre: "", email: "", password: "", rol: "estudiante" };

function TabUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(FORM_USER_DEFAULT);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const cargar = () => {
    setLoading(true);
    getAdminUsuarios()
      .then(setUsuarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{usuarios.length} usuarios en el sistema</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded bg-orange-300 px-3 py-2 text-sm font-bold text-white hover:bg-orange-400 transition"
        >
          <IconPlus size={16} /> Nuevo usuario
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{u.nombre}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono">{u.codigo}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge text={u.rol} className={ROL_BADGE[u.rol] || "bg-slate-100 text-slate-600"} />
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${u.activo ? "text-green-600" : "text-slate-400"}`}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggle(u.id)}
                      title={u.activo ? "Desactivar" : "Activar"}
                      className="text-slate-400 hover:text-orange-400 transition"
                    >
                      {u.activo
                        ? <IconToggleRight size={22} className="text-green-500" />
                        : <IconToggleLeft size={22} />
                      }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title="Nuevo usuario" onClose={() => { setShowModal(false); setError(null); setForm(FORM_USER_DEFAULT); }}>
          <form onSubmit={handleCrear} className="grid gap-3">
            {[
              { label: "Código universitario", key: "codigo", type: "text" },
              { label: "Nombre completo",      key: "nombre", type: "text" },
              { label: "Email",                key: "email",  type: "email" },
              { label: "Contraseña",           key: "password", type: "password" },
            ].map(({ label, key, type }) => (
              <label key={key} className="grid gap-1 text-xs font-bold text-slate-700">
                {label}
                <input
                  type={type}
                  required
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </label>
            ))}
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Rol
              <select
                value={form.rol}
                onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value }))}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
              >
                <option value="estudiante">Estudiante</option>
                <option value="docente">Docente</option>
                <option value="administrador">Administrador</option>
              </select>
            </label>
            {error && <p className="text-xs text-rose-500 bg-rose-50 rounded px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded bg-orange-300 py-2.5 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-50 transition"
            >
              {saving ? "Creando..." : "Crear usuario"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Aulas ────────────────────────────────────────────────────────────────

const FORM_AULA_DEFAULT = { codigo: "", nombre: "", edificio: "", capacidad: 40 };

function TabAulas() {
  const [aulas, setAulas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState(FORM_AULA_DEFAULT);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState(null);

  const cargar = () => {
    setLoading(true);
    getAdminAulas()
      .then(setAulas)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

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
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{aulas.length} aulas en el sistema</p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded bg-orange-300 px-3 py-2 text-sm font-bold text-white hover:bg-orange-400 transition"
        >
          <IconPlus size={16} /> Nueva aula
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Edificio</th>
                <th className="px-4 py-3">Capacidad</th>
                <th className="px-4 py-3">Horarios activos</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aulas.map((a) => (
                <tr key={a.id} className="bg-white hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-slate-700">{a.codigo}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{a.nombre}</td>
                  <td className="px-4 py-3 text-slate-500">{a.edificio || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{a.capacidad}</td>
                  <td className="px-4 py-3 text-slate-500">{a.total_horarios}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold ${a.activa ? "text-green-600" : "text-slate-400"}`}>
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
        <Modal title="Nueva aula" onClose={() => { setShowModal(false); setError(null); setForm(FORM_AULA_DEFAULT); }}>
          <form onSubmit={handleCrear} className="grid gap-3">
            {[
              { label: "Código (ej: LAB-401)", key: "codigo",   type: "text" },
              { label: "Nombre",               key: "nombre",   type: "text" },
              { label: "Edificio",             key: "edificio", type: "text" },
            ].map(({ label, key, type }) => (
              <label key={key} className="grid gap-1 text-xs font-bold text-slate-700">
                {label}
                <input
                  type={type}
                  value={form[key]}
                  required={key !== "edificio"}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
                />
              </label>
            ))}
            <label className="grid gap-1 text-xs font-bold text-slate-700">
              Capacidad
              <input
                type="number"
                min={1}
                max={500}
                required
                value={form.capacidad}
                onChange={(e) => setForm((f) => ({ ...f, capacidad: e.target.value }))}
                className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-orange-400"
              />
            </label>
            {error && <p className="text-xs text-rose-500 bg-rose-50 rounded px-3 py-2">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded bg-orange-300 py-2.5 text-sm font-bold text-white hover:bg-orange-400 disabled:opacity-50 transition"
            >
              {saving ? "Creando..." : "Crear aula"}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Horarios ─────────────────────────────────────────────────────────────

function TabHorarios() {
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    getAdminHorarios()
      .then(setHorarios)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
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
        <tbody className="divide-y divide-slate-100">
          {horarios.map((h) => (
            <tr key={h.id} className="bg-white hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">{h.materia}</td>
              <td className="px-4 py-3 text-slate-500">{h.dia}</td>
              <td className="px-4 py-3 font-mono text-slate-600 text-xs">{h.horario}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{h.aula}</td>
              <td className="px-4 py-3 text-slate-500 text-xs">{h.docente}</td>
              <td className="px-4 py-3 text-center text-slate-500">{h.total_inscritos}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-bold ${h.activo ? "text-green-600" : "text-slate-400"}`}>
                  {h.activo ? "Activo" : "Inactivo"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Accesos ──────────────────────────────────────────────────────────────

function TabAccesos() {
  const [accesos, setAccesos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminAccesos(100)
      .then(setAccesos)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-slate-400">Cargando...</p>;

  return (
    <div className="overflow-x-auto rounded border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-left text-xs font-bold text-slate-500">
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
        <tbody className="divide-y divide-slate-100">
          {accesos.map((a) => (
            <tr key={a.id} className={`hover:bg-slate-50 ${a.evento === "denegado" ? "bg-rose-50/40" : "bg-white"}`}>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{a.timestamp}</td>
              <td className="px-4 py-3">
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  a.evento === "permitido"
                    ? "bg-green-100 text-green-700"
                    : "bg-rose-100 text-rose-700"
                }`}>
                  {a.evento}
                </span>
              </td>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-900">{a.user_nombre}</p>
                <p className="text-xs text-slate-400 font-mono">{a.user_codigo}</p>
              </td>
              <td className="px-4 py-3">
                <Badge text={a.user_rol} className={ROL_BADGE[a.user_rol] || "bg-slate-100 text-slate-600"} />
              </td>
              <td className="px-4 py-3 text-xs text-slate-500">
                <p className="font-medium">{a.aula_nombre}</p>
                <p className="text-slate-400 font-mono">{a.aula_codigo}</p>
              </td>
              <td className="px-4 py-3 text-xs text-slate-400">{a.motivo || "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.ip_edge || "—"}</td>
            </tr>
          ))}
          {accesos.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-400">
                No hay eventos de acceso registrados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function AdminDashboard() {
  const navigate = useNavigate();

  const authUser = useMemo(() => {
    const stored = localStorage.getItem("authUser");
    return stored ? JSON.parse(stored) : null;
  }, []);

  const [activeTab, setActiveTab] = useState("Resumen");
  const [stats, setStats]         = useState(null);
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
    navigate("/login/admin-aulas");
  };

  if (!authUser || authUser.role !== "administrador") {
    return <Navigate to="/login/admin-aulas" replace />;
  }

  const TAB_ICONS = {
    Resumen:  <IconShieldCheck size={16} />,
    Usuarios: <IconUsers size={16} />,
    Aulas:    <IconBuilding size={16} />,
    Horarios: <IconCalendar size={16} />,
    Accesos:  <IconShieldCheck size={16} />,
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Clock />
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-2 py-1 text-sm font-bold text-rose-500"
          >
            <IconLogout2 size={18} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl p-4 sm:p-6 grid gap-6">
        <div>
          <p className="text-3xl font-bold text-orange-300">Hola, {authUser.nombre}</p>
          <p className="text-sm text-slate-500">Panel de control del sistema</p>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-sm font-bold transition border-b-2 ${
                activeTab === tab
                  ? "border-orange-400 text-orange-400"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {TAB_ICONS[tab]}
              {tab}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div>
          {activeTab === "Resumen"  && <TabResumen stats={stats} loading={statsLoading} />}
          {activeTab === "Usuarios" && <TabUsuarios />}
          {activeTab === "Aulas"    && <TabAulas />}
          {activeTab === "Horarios" && <TabHorarios />}
          {activeTab === "Accesos"  && <TabAccesos />}
        </div>
      </section>
    </main>
  );
}
