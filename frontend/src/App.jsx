import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import api from "./api";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ModulePage from "./pages/ModulePage";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  async function loadUser() {
    if (!localStorage.getItem("access")) {
      setChecking(false);
      return;
    }
    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
    } catch {
      localStorage.clear();
      setUser(null);
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    loadUser();
  }, []);
  if (checking) return <div className="loading">Loading HR workspace…</div>;
  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" /> : <Login onLogin={loadUser} />}
      />
      <Route
        path="/"
        element={
          user ? (
            <Layout
              user={user}
              onLogout={() => {
                localStorage.clear();
                setUser(null);
              }}
            />
          ) : (
            <Navigate to="/login" />
          )
        }
      >
        <Route index element={<Dashboard user={user} />} />
        {[
          "Employees",
          "Departments",
          "Attendance",
          "Leave Management",
          "Payroll",
          "Performance",
        ].map((name) => (
          <Route
            key={name}
            path={name.toLowerCase().replaceAll(" ", "-")}
            element={<ModulePage title={name} user={user} />}
          />
        ))}
        <Route path="reports" element={<Reports />} />
        <Route
          path="settings"
          element={<Settings user={user} onProfileUpdate={loadUser} />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
