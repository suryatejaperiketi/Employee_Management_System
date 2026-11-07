
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail, ArrowLeft, KeyRound } from "lucide-react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import api from "../api";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");

  // Login states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Forgot password states
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Common states
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const navigate = useNavigate();

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  function openForgotPassword() {
    setEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    clearMessages();
    setMode("forgot");
  }

  function backToLogin() {
    clearMessages();
    setMode("login");
  }

  // Login
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    clearMessages();

    try {
      const { data } = await api.post("/auth/token/", {
        username,
        password,
      });

      localStorage.setItem("access", data.access);
      localStorage.setItem("refresh", data.refresh);

      await onLogin();
      navigate("/");
    } catch {
      setError("Invalid username or password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  // Step 1: Send OTP
  async function sendOTP(e) {
    e.preventDefault();
    setBusy(true);
    clearMessages();

    try {
      const { data } = await api.post("/auth/forgot-password/", {
        email,
      });

      setSuccess(data.detail || "If an account exists with this email, an OTP will be sent.");
      setMode("verify");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Unable to send OTP. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Step 2: Verify OTP
  async function verifyOTP(e) {
    e.preventDefault();
    setBusy(true);
    clearMessages();

    try {
      const { data } = await api.post("/auth/verify-otp/", {
        email,
        otp,
      });

      setSuccess(data.detail || "OTP verified successfully.");
      setMode("reset");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Invalid or expired OTP. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  // Step 3: Reset password
  async function resetPassword(e) {
    e.preventDefault();
    setBusy(true);
    clearMessages();

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      setBusy(false);
      return;
    }

    try {
      const { data } = await api.post("/auth/reset-password/", {
        email,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      setSuccess(data.detail || "Password reset successfully.");

      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setMode("completed");
    } catch (err) {
      const response = err.response?.data;

      setError(
        response?.detail ||
        response?.new_password?.[0] ||
        response?.confirm_password?.[0] ||
        "Unable to reset password. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        {/* Brand */}
        <div className="login-brand">
          <span className="brand-mark">H</span>
          <span>
            HR<span className="brand-light">Flow</span>
          </span>
        </div>

        {/* LOGIN */}
        {mode === "login" && (
          <>
            <div className="login-icon">
              <ShieldCheck size={25} />
            </div>

            <h1>Welcome back</h1>
            <p className="muted">Sign in to your HR workspace</p>

            <form onSubmit={submit}>
              <label>Username or email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Enter your username"
                required
              />

              <div className="form-field">
                <label>Password</label>

                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="forgot-password-row">
                <button
                  type="button"
                  className="forgot-password-link"
                  onClick={openForgotPassword}
                >
                  Forgot Password?
                </button>
              </div>

              {error && <div className="error">{error}</div>}

              <button className="primary-btn full" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
            </form>

            <p className="demo-note">
              Use the account created by your Django administrator.
            </p>
          </>
        )}

        {/* STEP 1: FORGOT PASSWORD */}
        {mode === "forgot" && (
          <>
            <div className="login-icon">
              <Mail size={25} />
            </div>

            <h1>Forgot Password?</h1>
            <p className="muted">
              Enter your registered email address. We'll send you a verification OTP.
            </p>

            <form onSubmit={sendOTP}>
              <label>Registered Email Address</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
                required
              />

              {error && <div className="error">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button className="primary-btn full" disabled={busy}>
                {busy ? "Sending OTP…" : "Send OTP"}
              </button>
            </form>

            <button
              type="button"
              className="back-login-btn"
              onClick={backToLogin}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </>
        )}

        {/* STEP 2: VERIFY OTP */}
        {mode === "verify" && (
          <>
            <div className="login-icon">
              <ShieldCheck size={25} />
            </div>

            <h1>Verify OTP</h1>
            <p className="muted">
              Enter the six-digit OTP sent to your registered email.
            </p>

            <form onSubmit={verifyOTP}>
              <label>Verification Code</label>

              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(e) =>
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                required
              />

              {error && <div className="error">{error}</div>}
              {success && <div className="success-message">{success}</div>}

              <button
                className="primary-btn full"
                disabled={busy || otp.length !== 6}
              >
                {busy ? "Verifying…" : "Verify OTP"}
              </button>
            </form>

            <button
              type="button"
              className="back-login-btn"
              onClick={() => {
                clearMessages();
                setMode("forgot");
              }}
            >
              <ArrowLeft size={16} /> Change Email
            </button>
          </>
        )}

        {/* STEP 3: RESET PASSWORD */}
        {mode === "reset" && (
          <>
            <div className="login-icon">
              <KeyRound size={25} />
            </div>

            <h1>Reset Password</h1>
            <p className="muted">
              Create a new password for your HRFlow account.
            </p>

            <form onSubmit={resetPassword}>
              <div className="form-field">
                <label>New Password</label>

                <div className="password-input-wrapper">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              <div className="form-field">
                <label>Confirm New Password</label>

                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    required
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>

              {error && <div className="error">{error}</div>}

              <button className="primary-btn full" disabled={busy}>
                {busy ? "Resetting Password…" : "Reset Password"}
              </button>
            </form>
          </>
        )}

        {/* SUCCESS */}
        {mode === "completed" && (
          <>
            <div className="login-icon success-icon">
              <ShieldCheck size={28} />
            </div>

            <h1>Password Reset!</h1>
            <p className="muted">
              Your password has been changed successfully. You can now sign in using your new password.
            </p>

            {success && <div className="success-message">{success}</div>}

            <button
              type="button"
              className="primary-btn full"
              onClick={backToLogin}
            >
              Back to Login
            </button>
          </>
        )}

      </div>
    </div>
  );
}
