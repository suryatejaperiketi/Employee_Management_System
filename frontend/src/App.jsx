
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import api from "./api";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ModulePage from "./pages/ModulePage";
import Settings from "./pages/Settings";
import Reports from "./pages/Reports";
import ForcePassword from "./pages/ForcePassword";

import {
  EmployeeLayout,
  EmployeeHome,
  EmployeeSection,
  EmployeeProfile,
  EmployeeSettings
} from "./pages/EmployeePortal";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  async function loadUser() {
    if (!localStorage.getItem("access")) {
      setUser(null);
      setChecking(false);
      return null;
    }

    try {
      const { data } = await api.get("/auth/me/");
      setUser(data);
      return data;
    } catch (error) {
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      setUser(null);
      return null;
    } finally {
      setChecking(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    setUser(null);
  }

  if (checking) {
    return <div className="loading">Loading workspace…</div>;
  }

  // Employees must change their temporary password before accessing the app.
  if (user?.must_change_password) {
    return <ForcePassword onSuccess={logout} />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate
              to={user.role === "HR Admin" ? "/" : "/employee"}
              replace
            />
          ) : (
            <Login onLogin={loadUser} />
          )
        }
      />

      <Route
        path="/"
        element={
          user?.role === "HR Admin" ? (
            <Layout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? "/employee" : "/login"} replace />
          )
        }
      >
        <Route index element={<Dashboard user={user} />} />

        {[
          "Employees",
          "Departments",
          "Attendance",
          "Leave Management",
          "Holidays",
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

      <Route
        path="/employee"
        element={
          user && user.role !== "HR Admin" ? (
            <EmployeeLayout user={user} onLogout={logout} />
          ) : (
            <Navigate to={user ? "/" : "/login"} replace />
          )
        }
      >
        <Route index element={<EmployeeHome user={user} />} />
        <Route
          path="attendance"
          element={<EmployeeSection kind="attendance" />}
        />
        <Route
          path="leaves"
          element={<EmployeeSection kind="leaves" />}
        />
        <Route
          path="holidays"
          element={<EmployeeSection kind="holidays" />}
        />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="settings" element={<EmployeeSettings />} />
      </Route>

      <Route
        path="*"
        element={
          <Navigate
            to={
              user
                ? user.role === "HR Admin"
                  ? "/"
                  : "/employee"
                : "/login"
            }
            replace
          />
        }
      />
    </Routes>
  );
}
