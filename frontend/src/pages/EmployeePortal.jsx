import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { LayoutDashboard, Clock3, CalendarDays, Palmtree, UserRound, LogOut, RefreshCw, Settings} from "lucide-react";
import api from "../api";

const links = [
  ["Overview", "/employee", LayoutDashboard],
  ["My Attendance", "/employee/attendance", Clock3],
  ["My Leaves", "/employee/leaves", CalendarDays],
  ["Holidays", "/employee/holidays", Palmtree],
  ["My Profile", "/employee/profile", UserRound],
  ["My Settings", "/employee/settings", Settings],
];

export function EmployeeLayout({ user, onLogout }) {
  return <div className="app-shell employee-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">H</span><span>HR<span className="brand-light">Flow</span></span></div>
      <div className="nav-label">EMPLOYEE PORTAL</div>
      <nav>{links.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==="/employee"} className={({isActive})=>`nav-link ${isActive?"active":""}`}><Icon size={19}/><span>{label}</span></NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar">{(user?.full_name||"E")[0].toUpperCase()}</div><div><strong>{user?.full_name}</strong><small>Employee</small></div></div><button className="nav-link logout" onClick={onLogout}><LogOut size={18}/>Logout</button></div>
    </aside>
    <main className="main-area"><header className="topbar"><div className="crumb">Workspace <span>/</span> Employee Portal</div><div className="top-user"><div className="avatar">{(user?.full_name||"E")[0].toUpperCase()}</div><div><strong>{user?.full_name}</strong><small>Employee</small></div></div></header><div className="page-content"><Outlet/></div></main>
  </div>;
}

function EmployeeHome({user}) {
  const [data,setData]=useState(null),[error,setError]=useState("");
  async function load(){try{setError("");const r=await api.get("/employee/dashboard/");setData(r.data)}catch(e){setError(e.response?.data?.detail||"Unable to load employee dashboard.")}}
  useEffect(()=>{load()},[]);
  const e=data?.employee, a=data?.attendance_summary||{}, l=data?.leave_summary||{};
  return <div>
    <div className="page-heading"><div><p className="eyebrow">EMPLOYEE OVERVIEW</p><h1>Welcome back, {user?.full_name?.split(" ")[0]||"there"}!</h1><p className="muted">Your attendance, leave and company information at a glance.</p></div><button className="secondary-btn" onClick={load}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="error-banner">{error}</div>}
    {e&&<section className="panel" style={{marginBottom:20}}><p className="eyebrow">YOUR SERVICE HISTORY</p><h2 style={{margin:"6px 0"}}>{e.service_years} years, {e.service_months} months</h2><p className="muted">Since {e.joining_date} · {e.designation||"Employee"} · {e.department||"No department assigned"}</p><div className="stats-grid" style={{gridTemplateColumns:"repeat(4,minmax(0,1fr))",marginTop:18,marginBottom:0}}><div><small className="muted">Employee ID</small><strong>{e.employee_id}</strong></div><div><small className="muted">Employment</small><strong>{e.employment_type}</strong></div><div><small className="muted">Status</small><strong>{e.status}</strong></div><div><small className="muted">Joining date</small><strong>{e.joining_date}</strong></div></div></section>}
    <div className="stats-grid"><div className="stat-card"><div className="stat-label">Present this month</div><div className="stat-value">{a.present??0}</div></div><div className="stat-card"><div className="stat-label">Half days</div><div className="stat-value">{a.half_day??0}</div></div><div className="stat-card"><div className="stat-label">Absent</div><div className="stat-value">{a.absent??0}</div></div><div className="stat-card"><div className="stat-label">Pending leaves</div><div className="stat-value">{l.pending??0}</div></div></div>
    <section className="panel table-panel"><div className="panel-head"><div><h3>Recent attendance</h3><p className="muted">Your latest attendance records</p></div></div><div className="table-scroll"><table><thead><tr><th>Date</th><th>Check in</th><th>Check out</th><th>Hours</th><th>Status</th></tr></thead><tbody>{(data?.recent_attendance||[]).map((r,i)=><tr key={i}><td>{r.date}</td><td>{r.check_in||"—"}</td><td>{r.check_out||"—"}</td><td>{r.working_hours||"—"}</td><td>{r.status}</td></tr>)}</tbody></table></div></section>
  </div>;
}
function EmployeeSection({kind}) {
 const [rows,setRows]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[form,setForm]=useState({leave_type:"Casual Leave",start_date:"",end_date:"",days:1,reason:""});
 const [month,setMonth]=useState(new Date().toISOString().slice(0,7));
 async function load(){try{const endpoint=kind==="attendance"?"/attendance/records/":kind==="leaves"?"/leaves/requests/":"/holidays/records/";let url=endpoint,all=[];while(url){const r=await api.get(url);if(Array.isArray(r.data)){all=r.data;url=null;}else{all=all.concat(r.data.results||[]);url=r.data.next;}}setRows(kind==="attendance"?all.filter(x=>String(x.date||"").slice(0,7)===month):all)}catch(e){setError(e.response?.data?.detail||"Unable to load records.")}}
 useEffect(()=>{load()},[kind,month]);
 async function act(action,payload={}){setBusy(true);setError("");try{await api.post(action,payload);await load()}catch(e){setError(e.response?.data?.detail||"Request failed.")}finally{setBusy(false)}}
 const title=kind==="attendance"?"My Attendance":kind==="leaves"?"My Leave Requests":"Company Holidays";
 return <div><div className="page-heading"><div><p className="eyebrow">EMPLOYEE SELF SERVICE</p><h1>{title}</h1><p className="muted">View and manage your {kind}.</p></div><button className="secondary-btn" onClick={load}><RefreshCw size={16}/> Refresh</button></div>{error&&<div className="error-banner">{error}</div>}
 {kind==="attendance"&&<><section className="panel" style={{marginBottom:18}}><h3>Today's attendance</h3><p className="muted">Check in when you arrive and check out when you leave.</p><div className="modal-actions" style={{justifyContent:"flex-start",marginTop:16}}><button className="primary-btn" disabled={busy} onClick={()=>act("/attendance/records/check-in/")}>Check In</button><button className="secondary-btn" disabled={busy} onClick={()=>{const remarks=window.prompt("Checkout remarks (optional):","");if(remarks!==null)act("/attendance/records/check-out/",{remarks})}}>Check Out</button></div></section><label>Attendance month</label><input className="date-filter" type="month" value={month} onChange={e=>setMonth(e.target.value)}/></>}
 {kind==="leaves"&&<section className="panel" style={{marginBottom:18}}><h3>Apply for leave</h3><form onSubmit={e=>{e.preventDefault();act("/leaves/requests/",form)}}><div className="form-grid"><div className="form-field"><label>Leave type</label><select value={form.leave_type} onChange={e=>setForm({...form,leave_type:e.target.value})}>{["Casual Leave","Sick Leave","Earned Leave","Unpaid Leave"].map(x=><option key={x}>{x}</option>)}</select></div><div className="form-field"><label>Start date</label><input required type="date" value={form.start_date} onChange={e=>setForm({...form,start_date:e.target.value})}/></div><div className="form-field"><label>End date</label><input required type="date" value={form.end_date} onChange={e=>setForm({...form,end_date:e.target.value})}/></div><div className="form-field"><label>Number of days</label><input required min="1" type="number" value={form.days} onChange={e=>setForm({...form,days:Number(e.target.value)})}/></div><div className="form-field wide"><label>Reason</label><textarea required value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></div></div><button className="primary-btn" disabled={busy} style={{ marginTop: "12px" }}>Submit leave request</button></form></section>}
 <section className="panel table-panel"><div className="table-scroll"><table><thead><tr>{(kind==="attendance"?["Date","Check in","Check out","Hours","Status","Remarks"]:kind==="leaves"?["Type","From","To","Days","Reason","Status","HR remarks"]:["Holiday","Date","Scope","Department","Description"]).map(x=><th key={x}>{x}</th>)}</tr></thead><tbody>{rows.map(r=><tr key={r.id}>{(kind==="attendance"?[r.date,r.check_in||"—",r.check_out||"—",r.working_hours,r.status,r.remarks||"—"]:kind==="leaves"?[r.leave_type,r.start_date,r.end_date,r.days,r.reason,r.status,r.hr_remarks||"—"]:[r.name,r.date,r.scope,r.department_name||"All employees",r.description||"—"]).map((v,i)=><td key={i}>{v}</td>)}</tr>)}{!rows.length&&<tr><td className="empty" colSpan="7">No records found.</td></tr>}</tbody></table></div></section></div>;
}
function EmployeeProfile(){const [data,setData]=useState(null);useEffect(()=>{api.get("/employee/dashboard/").then(r=>setData(r.data.employee)).catch(()=>{});},[]);return <div><h1>My Profile</h1>{data&&<section className="panel"><h2>{data.full_name}</h2><p>Employee ID: {data.employee_id}</p><p>Email: {data.email}</p><p>Department: {data.department||"—"}</p><p>Designation: {data.designation||"—"}</p><p>Joining date: {data.joining_date}</p><h3>Service: {data.service_years} years, {data.service_months} months</h3></section>}</div>}

export function EmployeeSettings() {
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

  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [profileBusy, setProfileBusy] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [showPasswords, setShowPasswords] = useState({});

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data } = await api.get("/auth/me/");

        setProfile({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
        });
      } catch (error) {
        setProfileError("Unable to load your profile.");
      }
    }

    loadProfile();
  }, []);

  function handleProfileChange(e) {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  }

  function handlePasswordChange(e) {
    setPassword({
      ...password,
      [e.target.name]: e.target.value,
    });
  }

  async function updateProfile(e) {
    e.preventDefault();
    setProfileBusy(true);
    setProfileError("");
    setProfileMessage("");

    try {
      await api.put("/auth/profile/", profile);
      setProfileMessage("Your profile was updated successfully.");
    } catch (error) {
      const data = error.response?.data;

      setProfileError(
        Object.entries(data || {})
          .map(([key, value]) =>
            `${key}: ${Array.isArray(value) ? value.join(" ") : value}`
          )
          .join(" ") || "Unable to update your profile."
      );
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (password.new_password !== password.confirm_password) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordBusy(true);

    try {
      const { data } = await api.post(
        "/auth/change-password/",
        password
      );

      setPasswordMessage(
        data.detail || "Password changed successfully. Please log in again."
      );

      localStorage.removeItem("access");
      localStorage.removeItem("refresh");

      setTimeout(() => {
        window.location.assign("/login");
      }, 1200);
    } catch (error) {
      const data = error.response?.data;

      setPasswordError(
        Object.values(data || {})
          .flat()
          .join(" ") || "Unable to change your password."
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  const passwordFields = [
    ["current_password", "Current password"],
    ["new_password", "New password"],
    ["confirm_password", "Confirm new password"],
  ];

  return (
    <div>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EMPLOYEE SELF SERVICE</p>
          <h1>My Settings</h1>
          <p className="muted">
            Manage your account information and security.
          </p>
        </div>
      </div>

      {/* Profile Settings */}
      <section className="panel" style={{ maxWidth: 680, padding: 24, marginBottom: 24 }}>
        <h2>My Profile Settings</h2>
        <p className="muted">Update your account information.</p>

        <form onSubmit={updateProfile} className="form-grid" style={{ marginTop: 20 }}>
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
              {profileBusy ? "Updating..." : "Update Profile"}
            </button>
          </div>
        </form>
      </section>

      {/* Password Settings */}
      <section className="panel" style={{ maxWidth: 680, padding: 24 }}>
        <h2>Change Password</h2>
        <p className="muted">
          Update your password to keep your account secure.
        </p>

        <form onSubmit={changePassword} className="form-grid" style={{ marginTop: 20 }}>
          {passwordFields.map(([name, label]) => (
            <div className="form-field wide" key={name}>
              <label>{label}</label>

              <div className="password-input-wrapper">
                <input
                  type={showPasswords[name] ? "text" : "password"}
                  name={name}
                  value={password[name]}
                  onChange={handlePasswordChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
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
                  {showPasswords[name] ? "Hide" : "Show"}
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
              {passwordBusy ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function EmployeePortal({user,onLogout}){return <EmployeeLayout user={user} onLogout={onLogout}/>;}
export {EmployeeHome,EmployeeSection,EmployeeProfile};
