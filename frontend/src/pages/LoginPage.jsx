import { Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import LoginCard from "../components/LoginCard";
import { loginRoles } from "../data/loginRoles";

export default function LoginPage({ role }) {
  const roleConfig = loginRoles[role];

  if (!roleConfig) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthLayout roleConfig={roleConfig}>
      <LoginCard roleConfig={roleConfig} role={role} />
    </AuthLayout>
  );
}
