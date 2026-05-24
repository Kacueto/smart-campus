import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const dashboardByRole = {
  estudiante: "/dashboard/estudiante",
  docente: "/dashboard/profesor",
  administrador: "/dashboard/admin",
};

const roleMap = {
  student: "estudiante",
  teacher: "docente",
  classroomAdmin: "administrador",
};

const colorClasses = {
  orange: {
    focus:
      "focus:border-orange-300 focus:ring-orange-300/20",
    button:
      "bg-orange-200 text-orange-800",
    demo:
      "bg-orange-50 text-orange-700",
    demoTitle:
      "text-orange-800",
  },
  blue: {
    focus:
      "focus:border-blue-300 focus:ring-blue-300/20",
    button:
      "bg-blue-200 text-blue-800",
    demo:
      "bg-blue-50 text-blue-700",
    demoTitle:
      "text-blue-800",
  },
  green: {
    focus:
      "focus:border-green-300 focus:ring-green-300/20",
    button:
      "bg-green-200 text-green-800",
    demo:
      "bg-green-50 text-green-700",
    demoTitle:
      "text-green-800",
  },
};

/** Formulario de login que valida el rol del usuario antes de redirigir al dashboard correspondiente. */
export default function LoginCard({ roleConfig, role }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ codigo: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const colors = colorClasses[roleConfig.color] ?? colorClasses.orange;

  /** Actualiza el campo del formulario y limpia el mensaje de error. */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  /** Llama al API de login, verifica el rol esperado y redirige al dashboard si es correcto. */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const data = await login(formData.codigo, formData.password);

      const expectedRole = roleMap[role];

      if (data.role !== expectedRole) {
        setErrorMessage("No tienes acceso a este portal.");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("token", data.access_token);
      localStorage.setItem(
        "authUser",
        JSON.stringify({
          nombre: data.nombre,
          role: data.role,
          codigo: formData.codigo,
        })
      );

      navigate(dashboardByRole[data.role]);
    } catch (error) {
      if (error.response?.status === 401) {
        setErrorMessage("Código o contraseña incorrectos.");
      } else {
        setErrorMessage("Error de conexión. Intenta de nuevo.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <article className="w-full max-w-105 p-4">
      <div>
        <h2 className="m-0 text-2xl font-bold tracking-[-0.045em] text-slate-900 sm:text-3xl">
          Iniciar sesión
        </h2>

        <p className="mt-2.5 text-sm leading-6 text-slate-500">
          {roleConfig.helperText}
        </p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Código universitario
          <input className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 ${colors.focus}`} type="text" name="codigo" placeholder="Ej: 2024001" value={formData.codigo} onChange={handleChange} required />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Contraseña
          <input
            className={`w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none placeholder:text-slate-400 focus:bg-white focus:ring-4 ${colors.focus}`}
            type="password"
            name="password"
            placeholder="Ingresa tu contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </label>

        {errorMessage && (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {errorMessage}
          </p>
        )}

        <button
          className={`mt-1 w-full rounded px-4 py-3 disabled:cursor-not-allowed disabled:opacity-70 ${colors.button}`}
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Validando..." : roleConfig.redirectLabel}
        </button>
      </form>

      <div className={`mt-6 rounded-2xl p-4 text-xs leading-5 ${colors.demo}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className={`font-bold ${colors.demoTitle}`}>
              Credenciales demo:
            </p>

            {role === "student" && (
              <p className="mt-1">Código: 2024001 · Contraseña: 1234</p>
            )}

            {role === "teacher" && (
              <p className="mt-1">Código: DOC001 · Contraseña: 1234</p>
            )}

            {role === "classroomAdmin" && (
              <p className="mt-1">Código: ADM001 · Contraseña: 1234</p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
