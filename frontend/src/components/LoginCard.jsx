import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/api";
import { IconKey } from '@tabler/icons-react';

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
  student: {
    card: "bg-st-1 text-st-3 p-4 rounded-lg",
    focus: "focus:border-st-2 focus:ring-st-1",
    button: "bg-st-3 text-st-1",
    buttonKey: "bg-st-1 text-st-3",
    demoTitle: "text-st-3",
    input: "border border-st-1",
  },
  teacher: {
    card: "bg-tc-1 text-tc-3 p-4 rounded-lg",
    focus: "focus:border-tc-2 focus:ring-tc-1",
    button: "bg-tc-3 text-tc-1",
    buttonKey: "bg-tc-1 text-tc-3",
    demoTitle: "text-tc-3",
    input: "border border-tc-1",
  },
  admin: {
    card: "bg-ad-1 text-ad-3 p-4 rounded-lg",
    focus: "focus:border-ad-2 focus:ring-ad-1",
    button: "bg-ad-3 text-ad-1",
    buttonKey: "bg-ad-1 text-ad-3",
    demoTitle: "text-ad-3",
    input: "border border-ad-1",
  },
};

/** Formulario de login que valida el rol del usuario antes de redirigir al dashboard correspondiente. */
export default function LoginCard({ roleConfig, role }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ codigo: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const colors = colorClasses[roleConfig.color] ?? colorClasses.student;

  /** Actualiza el campo del formulario y limpia el mensaje de error. */
  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

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

  const fillDemoCredentials = () => {
    if (role === "student") {
      setFormData({ codigo: "2024001", password: "1234" });
    }

    if (role === "teacher") {
      setFormData({ codigo: "DOC001", password: "1234" });
    }

    if (role === "classroomAdmin") {
      setFormData({ codigo: "ADM001", password: "1234" });
    }

    setErrorMessage("");
  };

  return (
    <article className="w-full max-w-105 flex flex-col gap-6">
      <form className={`grid gap-2 ${colors.demoTitle}`} onSubmit={handleSubmit}>
        <label className="grid gap-1 text-sm font-black">
          Código universitario
          <input className={`w-full rounded-lg ${colors.input} px-4 py-3 font-body outline-none focus:ring-4 ${colors.focus}`} type="text" name="codigo" placeholder="Ej: 2024001" value={formData.codigo} onChange={handleChange} required/>
        </label>

        <label className="grid gap-1 text-sm font-black">
          Contraseña
          <input className={`w-full rounded-lg ${colors.input} px-4 py-3 font-body outline-none focus:ring-4 ${colors.focus}`} type="password" name="password" placeholder="Ingresa tu contraseña" value={formData.password} onChange={handleChange} required/>
        </label>

        {errorMessage && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
            {errorMessage}
          </p>
        )}

        <button className={`mt-1 w-full rounded-lg px-4 py-3 font-title text-xl tracking-wide disabled:cursor-not-allowed disabled:opacity-70 ${colors.button}`} type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Validando..." : "Ingresar"}
        </button>
      </form>

      <div className={`text-xs leading-5`}>
        <div className="flex gap-2 sm:flex-row sm:items-start justify-between items-center">
          <div>
            <p className={`text-sm font-black ${colors.demoTitle}`}>
              Credenciales demo
            </p>

            {role === "student" && (
              <p className={`${colors.demoTitle}`}>Código: 2024001 · Contraseña: 1234</p>
            )}

            {role === "teacher" && (
              <p className={`${colors.demoTitle}`}>Código: DOC001 · Contraseña: 1234</p>
            )}

            {role === "classroomAdmin" && (
              <p className={`${colors.demoTitle}`}>Código: ADM001 · Contraseña: 1234</p>
            )}
          </div>

          <button type="button" onClick={fillDemoCredentials} className={`text-xs font-bold ${colors.buttonKey} p-2 rounded-lg sm:w-auto`}>
            <IconKey />
          </button>
        </div>
      </div>
    </article>
  );
}
