import { Link } from "react-router-dom";
import { IconChevronLeft } from "@tabler/icons-react";

const colorClasses = {
  orange: {
    background: "bg-orange-200",
    text: "text-orange-900",
    muted: "text-orange-950/70",
    icon: "text-orange-900",
  },
  blue: {
    background: "bg-blue-200",
    text: "text-blue-900",
    muted: "text-blue-950/70",
    icon: "text-blue-900",
  },
  green: {
    background: "bg-green-200",
    text: "text-green-900",
    muted: "text-green-950/70",
    icon: "text-green-900",
  },
};

export default function AuthLayout({ roleConfig, children }) {
  const colors = colorClasses[roleConfig.color] ?? colorClasses.orange;

  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,1fr)_minmax(380px,520px)]">
      <section className={`${colors.background} flex flex-col gap-8 p-6 sm:p-8 lg:p-10`}>
        <Link to="/" className={`flex h-10 w-10 items-center justify-center rounded ${colors.icon}`} aria-label="Volver al inicio">
          <IconChevronLeft stroke={2} />
        </Link>

        <div className="flex max-w-2xl flex-1 flex-col justify-center gap-3">

          <h1 className={`text-3xl font-semibold tracking-[-0.04em] sm:text-4xl md:text-5xl ${colors.text}`}>
            {roleConfig.title}
          </h1>

          <p className={`max-w-xl text-sm leading-6 sm:text-base sm:leading-7 ${colors.muted}`}>
            {roleConfig.description}
          </p>
        </div>
      </section>

      <section className="flex">
        {children}
      </section>
    </main>
  );
}
