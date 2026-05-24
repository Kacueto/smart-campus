import { useEffect, useState } from "react";
import {
  IconSchool,
  IconUser,
  IconBuildingCommunity,
  IconChevronRight,
  IconX,
} from "@tabler/icons-react";
import LoginCard from "../components/LoginCard";
import { loginRoles } from "../data/loginRoles";
// import Footer from "../components/Footer";

const options = [
  {
    title: "Estudiante",
    description:
      "Consulta tu horario, genera tu código QR y solicita reservas de espacios.",
    icon: IconUser,
    color: "teal",
    role: "student",
  },
  {
    title: "Profesor",
    description:
      "Consulta tus clases, revisa estudiantes y valida la asistencia en tiempo real.",
    icon: IconSchool,
    color: "blue",
    role: "teacher",
  },
  {
    title: "Administrador de aulas",
    description:
      "Gestiona aulas, disponibilidad, reservas y el uso de espacios académicos.",
    icon: IconBuildingCommunity,
    color: "copper",
    role: "classroomAdmin",
  },
];

const colorClasses = {
  copper: {
    background: "bg-ad-1",
    text: "text-ad-3",
    muted: "text-ad-3/70",
    icon: "text-ad-2",
    overlay: "bg-ad-3/35",
  },
  blue: {
    background: "bg-tc-1",
    text: "text-tc-3",
    muted: "text-tc-3/70",
    icon: "text-tc-2",
    overlay: "bg-tc-3/35",
  },
  teal: {
    background: "bg-st-1",
    text: "text-st-3",
    muted: "text-st-3/70",
    icon: "text-st-2",
    overlay: "bg-st-3/35",
  },
};

export default function Home() {
  const [selectedRole, setSelectedRole] = useState(null);

  const selectedRoleConfig = selectedRole ? loginRoles[selectedRole] : null;

  const selectedOption = options.find((option) => option.role === selectedRole);

  const selectedColors = selectedOption
    ? colorClasses[selectedOption.color] ?? colorClasses.copper
    : colorClasses.copper;

  const closeModal = () => {
    setSelectedRole(null);
  };

  useEffect(() => {
    if (!selectedRole) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [selectedRole]);

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-12 bg-bg p-4 text-body sm:px-6">
      <div className="flex max-w-3xl flex-col">
        <img src="/lily.svg" alt="Flower" className="mb-4 size-32" />

        <h1 className="font-title text-5xl font-bold text-title sm:text-5xl md:text-6xl">
          Conoce Lirio
        </h1>

        <p className="max-w-2xl text-sm sm:text-base sm:leading-7">
          Nuestro sistema de control de asistencias y reserva de aulas. Desde
          aquí podrás gestionar tus clases, asistencias, reservas y espacios
          académicos.
        </p>
      </div>

      <section className="grid gap-2 md:grid-cols-3">
        {options.map((option) => {
          const Icon = option.icon;
          const colors = colorClasses[option.color] ?? colorClasses.copper;

          return (
            <button key={option.role} type="button" onClick={() => setSelectedRole(option.role)} className={`flex w-full items-center justify-between gap-4 rounded-lg ${colors.background} p-4 text-left`}>
              <div className={`flex items-center justify-center gap-2 ${colors.text}`}>
                <Icon className={colors.icon} size={24} stroke={2} />
                <h2 className="font-title text-xl">{option.title}</h2>
              </div>

              <span className={`text-sm font-title ${colors.icon}`}>
                <IconChevronRight size={24} stroke={2} />
              </span>
            </button>
          );
        })}
      </section>

      {/* <Footer /> */}

      {selectedRole && selectedRoleConfig && (
        <section
          className={`fixed inset-0 z-50 flex items-end justify-center px-4 py-4 sm:items-center ${selectedColors.overlay}`}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute inset-0 h-full w-full cursor-default"
            onClick={closeModal}
            aria-label="Cerrar modal"
          />

          <article className="relative z-10 grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-lg bg-white md:grid-cols-[minmax(0,1fr)_minmax(340px,440px)]">
            <section className={`${selectedColors.background} hidden flex-col justify-between p-6 md:flex`}>
              <button type="button" onClick={closeModal} className={`flex size-10 items-center justify-center rounded-lg ${selectedColors.text}`} aria-label="Cerrar modal">
                <IconX size={24} stroke={2} />
              </button>

              <div>
                <p className={`font-title text-2xl ${selectedColors.text}`}>
                  {selectedRoleConfig.label}
                </p>

                <h2 className={`mt-3 font-title text-5xl font-bold leading-none ${selectedColors.text}`}>
                  {selectedRoleConfig.title}
                </h2>

                <p className={`mt-4 max-w-md text-sm leading-6 ${selectedColors.muted}`}>
                  {selectedRoleConfig.description}
                </p>
              </div>
            </section>

            <section className="max-h-[92vh] overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">
              <div className="flex flex-col items-start justify-between md:hidden">
                  <p className={`font-title text-2xl ${selectedColors.text}`}>
                    {selectedRoleConfig.title}
                  </p>
                  <p className={`max-w-md text-sm ${selectedColors.muted}`}>
                    {selectedRoleConfig.description}
                  </p>
              </div>

              <LoginCard roleConfig={selectedRoleConfig} role={selectedRole} />
            </section>
          </article>
        </section>
      )}
    </main>
  );
}
