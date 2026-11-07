import { useEffect, useState } from "react";
import api from "../api";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function Settings({ user, onProfileUpdate }) {
  const [showPasswords, setShowPasswords] = useState({});
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });

  const [password, setPassword] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    setProfile({
      username: user?.username || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
    });
  }, [user]);

  function handleProfileChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  function handlePasswordChange(e) {
    setPassword({ ...password, [e.target.name]: e.target.value });
  }

  async function updateProfile(e) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileMessage("");
    setProfileError("");

    try {
      await api.put("/auth/profile/", profile);
      await onProfileUpdate?.();
      setProfileMessage("Administrator profile updated successfully.");
    } catch (err) {
      const data = err.response?.data;
      setProfileError(
        Object.entries(data || {})
          .map(
            ([key, value]) =>
              `${key}: ${Array.isArray(value) ? value.join(" ") : value}`,
          )
          .join(" ") || "Unable to update profile.",
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordBusy(true);
    setPasswordMessage("");
    setPasswordError("");

    try {
      const response = await api.post("/auth/change-password/", password);
      setPasswordMessage(
        response.data.detail || "Password changed successfully.",
      );

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      setTimeout(() => window.location.assign("/login"), 1200);
    } catch (err) {
      const data = err.response?.data;
      setPasswordError(
        Object.values(data || {})
          .flat()
          .join(" ") || "Unable to change password.",
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">HR WORKSPACE</p>
          <h1>Settings</h1>
          <p className="muted">
            Manage your administrator account and security.
          </p>
        </div>
      </div>

      {/* Administrator Profile */}
      <div
        className="panel"
        style={{ maxWidth: 680, padding: 24, marginBottom: 24 }}
      >
        <h2>Administrator Profile</h2>
        <p className="muted">Update your account information.</p>

        <form
          onSubmit={updateProfile}
          className="form-grid"
          style={{ marginTop: 20 }}
        >
          <div className="form-field wide">
            <label>Username</label>
            <input
              name="username"
              value={profile.username}
              onChange={handleProfileChange}
              required
            />
          </div>

          <div className="form-field">
            <label>First name</label>
            <input
              name="first_name"
              value={profile.first_name}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-field">
            <label>Last name</label>
            <input
              name="last_name"
              value={profile.last_name}
              onChange={handleProfileChange}
            />
          </div>

          <div className="form-field wide">
            <label>Email address</label>
            <input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleProfileChange}
            />
          </div>

          {profileError && (
            <div className="error-banner wide">{profileError}</div>
          )}
          {profileMessage && (
            <div className="success-banner wide">{profileMessage}</div>
          )}

          <div className="modal-actions wide">
            <button className="primary-btn" disabled={profileBusy}>
              {profileBusy ? "Updating…" : "Update Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="panel" style={{ maxWidth: 680, padding: 24 }}>
        <h2>Change administrator password</h2>
        <p className="muted">
          Update your password to keep your account secure.
        </p>

        <form
          onSubmit={changePassword}
          className="form-grid"
          style={{ marginTop: 20 }}
        >
          {[
            ["current_password", "Current password"],
            ["new_password", "New password"],
            ["confirm_password", "Confirm new password"],
          ].map(([name, label]) => (
            <div className="form-field wide" key={name}>
              <label>{label}</label>

              <div className="password-input-wrapper">
                <input
                  type={showPasswords[name] ? "text" : "password"}
                  name={name}
                  value={password[name]}
                  onChange={handlePasswordChange}
                  autoComplete="new-password"
                  required
                  minLength={8}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPasswords((prev) => ({
                      ...prev,
                      [name]: !prev[name],
                    }))
                  }
                  aria-label={
                    showPasswords[name] ? "Hide password" : "Show password"
                  }
                >
                  {showPasswords[name] ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>
          ))}

          {passwordError && (
            <div className="error-banner wide">{passwordError}</div>
          )}
          {passwordMessage && (
            <div className="success-banner wide">{passwordMessage}</div>
          )}

          <div className="modal-actions wide">
            <button className="primary-btn" disabled={passwordBusy}>
              {passwordBusy ? "Updating…" : "Change password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
