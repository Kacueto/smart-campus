import { Link } from "react-router-dom";
import {
  IconSchool,
  IconUser,
  IconBuildingCommunity,
  IconChevronRight,
} from "@tabler/icons-react";

const options = [
  {
    title: "Estudiante",
    description:
      "Consulta tu horario, genera tu código QR y solicita reservas de espacios.",
    href: "/login/estudiante",
    icon: IconUser,
  },
  {
    title: "Profesor",
    description:
      "Consulta tus clases, revisa estudiantes y valida la asistencia en tiempo real.",
    href: "/login/profesor",
    icon: IconSchool,
  },
  {
    title: "Administrador de aulas",
    description:
      "Gestiona aulas, disponibilidad, reservas y el uso de espacios académicos.",
    href: "/login/admin-aulas",
    icon: IconBuildingCommunity,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-4 py-10 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="mt-4 text-4xl font-bold tracking-tighter text-emerald-900 sm:text-5xl md:text-6xl">
            Sistema de asistencia y reserva de aulas
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500">
            Accede a la plataforma según tu rol dentro del campus. Desde aquí
            podrás gestionar clases, asistencia, reservas y espacios académicos.
          </p>
        </div>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {options.map((option) => {
            const Icon = option.icon;

            return (
              <Link key={option.href} to={option.href} className="flex justify-between items-center gap-4 border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 justify-center text-emerald-800">
                  <Icon size={24} stroke={2} />

                  <h2 className="text-xl font-bold text-emerald-900">
                    {option.title}
                  </h2>
                </div>

                <span className="text-sm font-bold text-emerald-900"><IconChevronRight size={24} stroke={2} /></span>
              </Link>
            );
          })}
        </section>

        <footer className="mt-10 border-t border-slate-200 pt-5">
          <p className="text-xs text-slate-400">
            Proyecto Smart Campus · Control de asistencia, reservas y gestión de
            aulas.
          </p>
        </footer>
      </section>
    </main>
  );
}
