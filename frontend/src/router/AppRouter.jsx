import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Home from "../pages/Home";
import LoginPage from "../pages/LoginPage";
import StudentDashboard from "../pages/StudentDashboard";
import TeacherDashboard from "../pages/TeacherDashboard";
import QRPage from "../pages/QRPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/login/profesor" element={<LoginPage role="teacher" />} />
        <Route path="/login/estudiante" element={<LoginPage role="student" />} />
        <Route path="/login/admin-aulas" element={<LoginPage role="classroomAdmin" />} />

        <Route path="/dashboard/estudiante" element={<StudentDashboard />} />
        <Route path="/dashboard/profesor" element={<TeacherDashboard />} />
        <Route path="/qr" element={<QRPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
