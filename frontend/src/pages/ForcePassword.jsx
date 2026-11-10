
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function ForcePassword({ onSuccess }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (next !== confirm) {
      setError("New password and confirm password do not match.");
      return;
    }

    setBusy(true);

    try {
      await api.post("/auth/change-password/", {
        current_password: current,
        new_password: next,
        confirm_password: confirm,
      });

      setSuccess("Password changed successfully. Please log in again.");

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      if (onSuccess) onSuccess();

      navigate("/login", { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        err.response?.data?.new_password?.[0] ||
        err.response?.data?.current_password?.[0] ||
        "Unable to change password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Change your temporary password</h1>

        <p className="muted">
          Set a new password before accessing your employee dashboard.
        </p>

        <form onSubmit={submit}>
          <label>Temporary password</label>
          <input
            required
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />

          <label>New password</label>
          <input
            required
            minLength="8"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />

          <label>Confirm new password</label>
          <input
            required
            minLength="8"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}

          <button className="primary-btn full" disabled={busy}>
            {busy ? "Updating..." : "Change password"}
          </button>
        </form>

        <p className="muted">
          After changing your password, sign in again with your new password.
        </p>
      </div>
    </div>
  );
}
