import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";

const dashboardByRole = {
  estudiante: "/dashboard/estudiante",
  docente:    "/dashboard/profesor",
  administrador: "/dashboard/admin",
};

const roleMap = {
  student:       "estudiante",
  teacher:       "docente",
  classroomAdmin: "administrador",
};

export default function LoginCard({ roleConfig, role }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ codigo: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const data = await login(formData.codigo, formData.password);

      // Verificar que el rol coincide con la pantalla de login
      const expectedRole = roleMap[role];
      if (data.role !== expectedRole) {
        setErrorMessage("No tienes acceso a este portal.");
        setIsSubmitting(false);
        return;
      }

      // Guardar token y usuario
      localStorage.setItem("token", data.access_token);
      localStorage.setItem("authUser", JSON.stringify({
        nombre: data.nombre,
        role:   data.role,
        codigo: formData.codigo,
      }));

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
    <article className="w-full max-w-105 border border-slate-200/80 bg-white p-8">
      <div>
        <h2 className="m-0 text-3xl font-bold tracking-[-0.045em] text-slate-900">
          Iniciar sesión
        </h2>
        <p className="mt-2.5 text-sm leading-6 text-slate-500">
          {roleConfig.helperText}
        </p>
      </div>

      <form className="mt-7 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Código universitario
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-300/20"
            type="text"
            name="codigo"
            placeholder="Ej: 2024001"
            value={formData.codigo}
            onChange={handleChange}
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Contraseña
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-300/20"
            type="password"
            name="password"
            placeholder="Ingresa tu contraseña"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </label>

        {errorMessage && (
          <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          className="mt-1 w-full rounded-2xl bg-orange-300 px-4 py-3.5 font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Validando..." : roleConfig.redirectLabel}
        </button>
      </form>

      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
        <p className="font-bold text-slate-700">Credenciales demo:</p>
        {role === "student"       && <p>Código: 2024001 · Contraseña: 1234</p>}
        {role === "teacher"       && <p>Código: DOC001 · Contraseña: 1234</p>}
        {role === "classroomAdmin" && <p>Código: ADM001 · Contraseña: 1234</p>}
      </div>
    </article>
  );
}
