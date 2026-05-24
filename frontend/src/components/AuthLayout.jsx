import { Link } from "react-router-dom";
import { IconChevronLeft } from "@tabler/icons-react";

const colorClasses = {
  student: {
    background: "bg-st-1",
    text: "text-st-3",
    muted: "text-st-3/75",
    icon: "text-st-2",
  },
  teacher: {
    background: "bg-tc-1",
    text: "text-tc-3",
    muted: "text-tc-3/75",
    icon: "text-tc-2",
  },
  admin: {
    background: "bg-ad-1",
    text: "text-ad-3",
    muted: "text-ad-3/75",
    icon: "text-ad-2",
  },
};

export default function AuthLayout({ roleConfig, children }) {
  const colors = colorClasses[roleConfig.color] ?? colorClasses.student;

  return (
    <main className="min-h-screen flex flex-col justify-center gap-6 bg-white font-body lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
      <section className={`flex flex-col gap-4 p-6 sm:p-8 lg:min-h-screen lg:p-10 pb-0`}>
        <Link to="/" className={`flex items-center`} aria-label="Volver al inicio">
          <span className={`${colors.icon}`}>
            <IconChevronLeft size={28} stroke={2} />
          </span>
        </Link>

        <div className="flex max-w-2xl flex-1 flex-col justify-center gap-2">
          <h1 className={`font-title text-4xl font-bold leading-none tracking-normal sm:text-6xl md:text-7xl ${colors.text}`}>
            {roleConfig.title}
          </h1>

          <p className={`max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${colors.muted}`}>
            {roleConfig.description}
          </p>
        </div>
      </section>

      <section className={`flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8 pt-0`}>
        {children}
      </section>
    </main>
  );
}
