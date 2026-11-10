
import { useCallback, useEffect, useState } from "react";
import api from "../api";
import { FiEye, FiEyeOff, FiPlus, FiX, FiShield } from "react-icons/fi";

export default function Settings({ user, onProfileUpdate }) {
  const [showPasswords, setShowPasswords] = useState({});
  const [showAdminPasswords, setShowAdminPasswords] = useState({});

  // Existing profile state
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
  });

  // Existing password state
  const [password, setPassword] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  // Existing messages and loading states
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  // HR administrator management
  const [administrators, setAdministrators] = useState([]);
  const [adminCount, setAdminCount] = useState(0);
  const [maxAdministrators, setMaxAdministrators] = useState(2);
  const [adminLoading, setAdminLoading] = useState(true);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);

  const initialAdminForm = {
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    password: "",
    confirm_password: "",
  };

  const [newAdmin, setNewAdmin] = useState(initialAdminForm);
  const [newAdminError, setNewAdminError] = useState("");

  // Load current administrator profile
  useEffect(() => {
    setProfile({
      username: user?.username || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
    });
  }, [user]);

  // Load HR administrators
  const loadAdministrators = useCallback(async () => {
    setAdminLoading(true);
    setAdminError("");

    try {
      const response = await api.get("/auth/administrators/");

      setAdministrators(response.data.administrators || []);
      setAdminCount(response.data.count || 0);
      setMaxAdministrators(response.data.max_administrators || 2);
    } catch (err) {
      const data = err.response?.data;

      setAdminError(
        data?.detail ||
          "Unable to load HR administrator accounts. Please try again.",
      );
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdministrators();
  }, [loadAdministrators]);

  function handleProfileChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  function handlePasswordChange(e) {
    setPassword({ ...password, [e.target.name]: e.target.value });
  }

  // Update existing administrator profile
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

  // Change existing administrator password
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

  // Open registration popup
  function openAdminModal() {
    setNewAdmin(initialAdminForm);
    setNewAdminError("");
    setShowAdminModal(true);
  }

  function closeAdminModal() {
    if (adminBusy) return;

    setShowAdminModal(false);
    setNewAdminError("");
  }

  function handleNewAdminChange(e) {
    setNewAdmin({
      ...newAdmin,
      [e.target.name]: e.target.value,
    });
  }

  // Create second HR administrator
  async function createAdministrator(e) {
    e.preventDefault();
    setNewAdminError("");
    setAdminMessage("");

    if (newAdmin.password !== newAdmin.confirm_password) {
      setNewAdminError("Passwords do not match.");
      return;
    }

    if (newAdmin.password.length < 8) {
      setNewAdminError("Password must contain at least 8 characters.");
      return;
    }

    setAdminBusy(true);

    try {
      const response = await api.post("/auth/administrators/", newAdmin);

      setAdminMessage(
        response.data.detail || "HR administrator created successfully.",
      );

      setShowAdminModal(false);
      setNewAdmin(initialAdminForm);

      await loadAdministrators();
    } catch (err) {
      const data = err.response?.data;

      setNewAdminError(
        Object.entries(data || {})
          .map(([key, value]) => {
            const message = Array.isArray(value)
              ? value.join(" ")
              : typeof value === "object"
                ? JSON.stringify(value)
                : value;

            return `${key}: ${message}`;
          })
          .join(" ") || "Unable to create HR administrator.",
      );
    } finally {
      setAdminBusy(false);
    }
  }

  const canAddAdministrator = adminCount < maxAdministrators;

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
      <div
        className="panel"
        style={{ maxWidth: 680, padding: 24, marginBottom: 24 }}
      >
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

      {/* HR Administrator Management */}
      <div
        className="panel"
        style={{ maxWidth: 680, padding: 24, marginBottom: 24 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>HR Administrator Management</h2>
            <p className="muted">
              Manage accounts with full HR administrator access.
            </p>
          </div>

          <div
            style={{
              background: "#eff6ff",
              color: "#2563eb",
              padding: "7px 12px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {adminCount} / {maxAdministrators} Accounts
          </div>
        </div>

        {adminError && (
          <div className="error-banner" style={{ marginTop: 16 }}>
            {adminError}
            <button
              type="button"
              onClick={loadAdministrators}
              style={{
                marginLeft: 10,
                border: "none",
                background: "transparent",
                color: "inherit",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Retry
            </button>
          </div>
        )}

        {adminMessage && (
          <div className="success-banner" style={{ marginTop: 16 }}>
            {adminMessage}
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          {adminLoading ? (
            <p className="muted">Loading administrator accounts...</p>
          ) : administrators.length === 0 ? (
            <p className="muted">No administrator accounts found.</p>
          ) : (
            administrators.map((admin) => (
              <div
                key={admin.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: 16,
                  border: "1px solid #e5eaf2",
                  borderRadius: 10,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "#eaf1ff",
                      color: "#2563eb",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <FiShield size={19} />
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "#172554" }}>
                      {admin.full_name || admin.username}
                      {admin.is_current_user && (
                        <span
                          style={{
                            marginLeft: 7,
                            color: "#64748b",
                            fontSize: 11,
                            fontWeight: 500,
                          }}
                        >
                          (You)
                        </span>
                      )}
                    </div>

                    <div
                      className="muted"
                      style={{
                        fontSize: 12,
                        overflowWrap: "anywhere",
                      }}
                    >
                      @{admin.username} · {admin.email}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    color: admin.is_active ? "#15803d" : "#dc2626",
                    background: admin.is_active ? "#dcfce7" : "#fee2e2",
                    borderRadius: 20,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {admin.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            ))
          )}
        </div>

        {!adminLoading && canAddAdministrator && (
          <button
            type="button"
            className="primary-btn"
            onClick={openAdminModal}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <FiPlus size={17} />
            Add HR Administrator
          </button>
        )}

        {!adminLoading && !canAddAdministrator && (
          <div
            style={{
              marginTop: 16,
              padding: 13,
              borderRadius: 8,
              background: "#f1f5f9",
              color: "#475569",
              fontSize: 13,
            }}
          >
            Maximum of {maxAdministrators} HR administrator accounts reached.
          </div>
        )}
      </div>

      {/* Add HR Administrator Modal */}
      {showAdminModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAdminModal();
          }}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 1000,
            overflowY: "auto",
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-admin-title"
            className="panel"
            style={{
              width: "100%",
              maxWidth: 560,
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 24,
              background: "#ffffff",
              margin: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div>
                <h2 id="add-admin-title">Add HR Administrator</h2>
                <p className="muted">
                  Create a separate login account with full HR access.
                </p>
              </div>

              <button
                type="button"
                onClick={closeAdminModal}
                disabled={adminBusy}
                aria-label="Close registration form"
                style={{
                  border: "none",
                  background: "#f1f5f9",
                  borderRadius: 8,
                  padding: 8,
                  cursor: "pointer",
                  color: "#475569",
                }}
              >
                <FiX size={19} />
              </button>
            </div>

            <form onSubmit={createAdministrator} className="form-grid">
              <div className="form-field">
                <label>First name *</label>
                <input
                  name="first_name"
                  value={newAdmin.first_name}
                  onChange={handleNewAdminChange}
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div className="form-field">
                <label>Last name *</label>
                <input
                  name="last_name"
                  value={newAdmin.last_name}
                  onChange={handleNewAdminChange}
                  placeholder="Enter last name"
                  required
                />
              </div>

              <div className="form-field wide">
                <label>Username *</label>
                <input
                  name="username"
                  value={newAdmin.username}
                  onChange={handleNewAdminChange}
                  placeholder="Choose a unique username"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="form-field wide">
                <label>Email address *</label>
                <input
                  type="email"
                  name="email"
                  value={newAdmin.email}
                  onChange={handleNewAdminChange}
                  placeholder="Enter email address"
                  autoComplete="email"
                  required
                />
              </div>

              {[
                ["password", "Password"],
                ["confirm_password", "Confirm password"],
              ].map(([name, label]) => (
                <div className="form-field wide" key={name}>
                  <label>{label} *</label>

                  <div className="password-input-wrapper">
                    <input
                      type={showAdminPasswords[name] ? "text" : "password"}
                      name={name}
                      value={newAdmin[name]}
                      onChange={handleNewAdminChange}
                      placeholder={`Enter ${label.toLowerCase()}`}
                      autoComplete={
                        name === "password"
                          ? "new-password"
                          : "new-password"
                      }
                      minLength={8}
                      required
                    />

                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() =>
                        setShowAdminPasswords((prev) => ({
                          ...prev,
                          [name]: !prev[name],
                        }))
                      }
                      aria-label={
                        showAdminPasswords[name]
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      {showAdminPasswords[name] ? (
                        <FiEyeOff />
                      ) : (
                        <FiEye />
                      )}
                    </button>
                  </div>
                </div>
              ))}

              <div
                className="wide"
                style={{
                  background: "#eff6ff",
                  color: "#1e40af",
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 12,
                }}
              >
                This account will have the same HR application permissions
                as your account, but will use its own login credentials.
              </div>

              {newAdminError && (
                <div className="error-banner wide">{newAdminError}</div>
              )}

              <div
                className="modal-actions wide"
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={closeAdminModal}
                  disabled={adminBusy}
                >
                  Cancel
                </button>

                <button className="primary-btn" disabled={adminBusy}>
                  {adminBusy ? "Creating account..." : "Create Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
