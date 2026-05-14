import { Link } from "react-router-dom";

const options = [
  {
    title: "Profesor",
    description: "Registro de asistencia, clases y reservas asociadas.",
    href: "/login/profesor",
  },
  {
    title: "Estudiante",
    description: "Consulta de clases, asistencia y espacios asignados.",
    href: "/login/estudiante",
  },
  {
    title: "Administrador de aulas",
    description: "Gestión de reservas, salones y disponibilidad.",
    href: "/login/admin-aulas",
  },
];

export default function Home() {
  return (
    <main className="">
      <section className="flex gap-4">
        {options.map((option) => (
          <Link key={option.href} to={option.href} className="bg-slate-800 p-2">
            <h2 className="text-slate-200">{option.title}</h2>
          </Link>
        ))}
      </section>
    </main>
  );
}
