import { useEffect, useState } from 'react'
import { Users, UserCheck, UserX, CalendarClock, Building2, Wallet, RefreshCw, ArrowUpRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import api from '../api'
import { Link } from 'react-router-dom'
const colors=['#2563eb','#60a5fa','#93c5fd','#bfdbfe']
export default function Dashboard({user}) {
  const [data,setData]=useState(null),[error,setError]=useState('')
  async function refresh(){try{setError('');const r=await api.get('/dashboard/');setData(r.data)}catch{setError('Could not load dashboard data. Check that the backend is running.')}}
  useEffect(()=>{refresh()},[])
  const stats=data?[['Total Employees',data.total_employees,Users,'blue','/employees'],['Present Today',data.present_today,UserCheck,'green','/attendance'],['Absent Today',data.absent_today,UserX,'red','/attendance'],['Pending Leaves',data.pending_leaves,CalendarClock,'orange','/leave-management'],['Departments',data.total_departments,Building2,'purple','/departments'],['Pending Payroll',data.pending_payroll,Wallet,'blue','/payroll']]:[]
  const deptData=(data?.department_distribution||[]).map(d=>({name:d.name,value:d.employee_count}))
  return <div>
    <div className="page-heading"><div><p className="eyebrow">OVERVIEW</p><h1>Welcome back, {user?.full_name?.split(' ')[0]||'there'}!</h1><p className="muted">Here’s what’s happening across your organization today.</p></div><button className="secondary-btn" onClick={refresh}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="error-banner">{error}</div>}
    <div className="stats-grid">{stats.map(([label,value,Icon,tone,path])=><Link to={path} className="stat-card" key={label} style={{textDecoration:'none',color:'inherit',cursor:'pointer'}}><div className={`stat-icon ${tone}`}><Icon size={20}/></div><div className="stat-label">{label}</div><div className="stat-value">{value??'—'}</div><div className="stat-foot">View details <ArrowUpRight size={13}/></div></Link>)}</div>
    <div className="section-heading"><div><h2>People insights</h2><p className="muted">A quick look at your workforce</p></div></div>
    <div className="charts-grid"><div className="panel"><div className="panel-head"><h3>Attendance overview</h3><span className="tag">Today</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={[{day:'Present',count:data?.present_today||0},{day:'Absent',count:data?.absent_today||0}]}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false}/><YAxis allowDecimals={false} axisLine={false} tickLine={false}/><Tooltip/><Bar dataKey="count" fill="#2563eb" radius={[7,7,0,0]} barSize={48}/></BarChart></ResponsiveContainer></div></div>
    <div className="panel"><div className="panel-head"><h3>Department distribution</h3><span className="tag">Live data</span></div><div className="chart donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={deptData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={88} paddingAngle={4}>{deptData.map((x,i)=><Cell key={x.name} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer></div>{deptData.length===0&&<p className="muted">No department data yet.</p>}<div className="legend">{deptData.map((x,i)=><span key={x.name}><i style={{background:colors[i%colors.length]}}/>{x.name}</span>)}</div></div></div>
    <div className="panel table-panel"><div className="panel-head"><div><h3>Recently added employees</h3><p className="muted">Latest employee records</p></div></div><div className="table-scroll"><table><thead><tr><th>Employee ID</th><th>Employee name</th><th>Department</th><th>Designation</th><th>Joining date</th><th>Status</th></tr></thead><tbody>{(data?.recent_employees||[]).map(e=><tr key={e.employee_id}><td>{e.employee_id}</td><td>{e.first_name} {e.last_name}</td><td>{e.department__name||'—'}</td><td>{e.designation||'—'}</td><td>{e.joining_date}</td><td>{e.status}</td></tr>)}{data&&!data.recent_employees?.length&&<tr><td colSpan="6" className="empty">No employee records yet. Add your first employee from Employees.</td></tr>}</tbody></table></div></div>
  </div>
}
