import { Link } from "react-router-dom";
import { IconChevronLeft } from '@tabler/icons-react';

export default function AuthLayout({ roleConfig, children }) {
  return (
    <main className="min-h-screen">
      <section className="bg-orange-200 p-8 flex flex-col gap-8">
        <Link to="/" className="">
          <IconChevronLeft stroke={2} />
        </Link>

        <div className="flex flex-col gap-2">

          <h1 className="text-3xl font-semibold">{roleConfig.title}</h1>

          <p className="">{roleConfig.description}</p>
        </div>

        {/* <div className="auth-footer-note">
          <span>Sistema académico inteligente</span>
          <strong>Asistencia · Reservas · Aulas</strong>
        </div>*/}
      </section>

      <section className="">{children}</section>
    </main>
  );
}
