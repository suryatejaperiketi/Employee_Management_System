import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutDashboard, Users, Building2, CalendarCheck, CalendarDays, Palmtree, Wallet,
  TrendingUp, FileBarChart, Settings, LogOut, Menu, X, ChevronLeft
} from 'lucide-react'

const links = [
  ['Dashboard','/',LayoutDashboard],
  ['Employees','/employees',Users],
  ['Departments','/departments',Building2],
  ['Attendance','/attendance',CalendarCheck],
  ['Leave Management','/leave-management',CalendarDays],
  ['Holidays','/holidays',Palmtree],
  ['Payroll','/payroll',Wallet],
  ['Performance','/performance',TrendingUp],
  ['Reports','/reports',FileBarChart],
  ['Settings','/settings',Settings]
]

export default function Layout({user,onLogout}) {
  const [open,setOpen] = useState(false), [collapsed,setCollapsed] = useState(false)
  return <div className="app-shell">
    <aside className={`sidebar ${collapsed?'collapsed':''} ${open?'mobile-open':''}`}>
      <div className="brand"><span className="brand-mark">H</span>{!collapsed && <span>HR<span className="brand-light">Flow</span></span>}<button className="icon-btn mobile-close" onClick={()=>setOpen(false)}><X size={18}/></button></div>
      <div className="nav-label">WORKSPACE</div>
      <nav>{links.map(([label,path,Icon])=><NavLink key={path} to={path} end={path==='/'} title={collapsed?label:''} onClick={()=>setOpen(false)} className={({isActive})=>`nav-link ${isActive?'active':''}`}><Icon size={19}/>{!collapsed&&<span>{label}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="profile-mini"><div className="avatar">{(user?.full_name||'U').slice(0,1).toUpperCase()}</div>{!collapsed&&<div><strong>{user?.full_name}</strong><small>{user?.role}</small></div>}</div><button className="nav-link logout" onClick={onLogout}><LogOut size={18}/>{!collapsed&&<span>Logout</span>}</button></div>
      <button className="collapse-btn" onClick={()=>setCollapsed(!collapsed)}><ChevronLeft size={16}/></button>
    </aside>
    {open&&<div className="scrim" onClick={()=>setOpen(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="icon-btn hamburger" onClick={()=>setOpen(true)}><Menu/></button><div className="crumb">Workspace <span>/</span> HR Management</div><div className="top-user"><div className="avatar">{(user?.full_name||'U').slice(0,1).toUpperCase()}</div><div><strong>{user?.full_name}</strong><small>{user?.role}</small></div></div></header>
      <div className="page-content"><Outlet/></div>
    </main>
  </div>
}
