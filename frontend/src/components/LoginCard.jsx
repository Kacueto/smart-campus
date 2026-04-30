import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { users } from "../data/users";

const dashboardByRole = {
  student: "/dashboard/estudiante",
  teacher: "/dashboard/profesor",
  classroomAdmin: "/dashboard/admin-aulas",
};

export default function LoginCard({ roleConfig, role }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));

    setErrorMessage("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage("");

    setTimeout(() => {
      const userFound = users.find(
        (user) =>
          user.email === formData.email &&
          user.password === formData.password &&
          user.role === role
      );

      if (!userFound) {
        setErrorMessage("Correo, contraseña o tipo de usuario incorrecto.");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem(
        "authUser",
        JSON.stringify({
          id: userFound.id,
          name: userFound.name,
          email: userFound.email,
          role: userFound.role,
          code: userFound.code,
          program: userFound.program,
        })
      );

      navigate(dashboardByRole[userFound.role]);
    }, 700);
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
          Correo institucional
          <input
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-300/20"
            type="email"
            name="email"
            placeholder="usuario@uninorte.edu.co"
            value={formData.email}
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

        <div className="flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-500">
            <input
              className="h-4 w-4 rounded border-slate-300 accent-orange-300"
              type="checkbox"
            />
            Recordarme
          </label>

          <button
            type="button"
            className="border-0 bg-transparent p-0 text-sm font-bold text-slate-700 transition hover:text-orange-400"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

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

        {role === "student" && (
          <>
            <p>Correo: estudiante@uninorte.edu.co</p>
            <p>Contraseña: estudiante123</p>
          </>
        )}

        {role === "teacher" && (
          <>
            <p>Correo: profesor@uninorte.edu.co</p>
            <p>Contraseña: profesor123</p>
          </>
        )}

        {role === "classroomAdmin" && (
          <>
            <p>Correo: admin@uninorte.edu.co</p>
            <p>Contraseña: admin123</p>
          </>
        )}
      </div>
    </article>
  );
}
