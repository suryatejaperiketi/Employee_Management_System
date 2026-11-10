import { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { Plus, Search, RefreshCw, Pencil, Trash2, X, Check, CalendarDays, Download, KeyRound } from 'lucide-react'

const config = {
  Departments: { endpoint:'/employees/departments/', fields:[
    ['name','Department name','text',true],['description','Description','textarea']
  ], columns:['name','description','employee_count'] },
  Employees: { endpoint:'/employees/records/', fields:[
    ['employee_id','Employee ID','text',true],['first_name','First name','text',true],['last_name','Last name','text',true],
    ['email','Email','email',true],['phone','Phone','tel'],['date_of_birth','Date of birth','date'],
    ['gender','Gender','select',['Male','Female','Other']],['address','Address','textarea'],
    ['department','Department','department'],['designation','Designation','text'],['joining_date','Joining date','date',true],
    ['employment_type','Employment type','select',['Full-time','Part-time','Contract','Intern']],
    ['salary','Monthly salary (₹)','number'],['status','Status','select',['Active','Inactive','On Notice']],['emergency_contact','Emergency contact','text']
  ], columns:['employee_id','first_name','last_name','department_name','designation','joining_date','status'] },
  Attendance: { endpoint:'/attendance/records/', fields:[
    ['employee','Employee','employee',true],['date','Attendance date','date',true],['status','Status','select',['Present','Absent','Half Day','On Leave','Holiday']],['check_in','Check-in','time'],
    ['check_out','Check-out','time'],['remarks','Remarks','textarea']
  ], columns:['employee_name','date','check_in','check_out','working_hours','status'] },
  Holidays: { endpoint:'/holidays/records/', fields:[
    ['name','Holiday name','text',true],['date','Holiday date','date',true],['description','Description','textarea'],['scope','Applies to','select',['All','Department']],['department','Department','department']
  ], columns:['name','date','scope','department_name','description'] },
  'Leave Management': { endpoint:'/leaves/requests/', fields:[
    ['employee','Employee','employee',true],['leave_type','Leave type','select',['Casual Leave','Sick Leave','Earned Leave','Unpaid Leave']],
    ['start_date','Start date','date',true],['end_date','End date','date',true],['days','Number of days','number',true],
    ['reason','Reason','textarea',true],['status','Status','select',['Pending','Approved','Rejected','Cancelled']],['hr_remarks','HR remarks','textarea']
  ], columns:['employee_name','leave_type','start_date','end_date','days','reason','status','hr_remarks'] },
  Payroll: { endpoint:'/payroll/records/', fields:[
    ['employee','Employee','employee',true],['period','Pay period','month',true],['basic_salary','Basic salary (₹)','number',true],
    ['allowances','Allowances (₹)','number'],['deductions','Deductions (₹)','number'],['tax_deductions','Tax deductions (₹)','number'],
    ['status','Payment status','select',['Draft','Pending Approval','Approved','Paid']],['paid_on','Paid on','date']
  ], columns:['employee_name','period','basic_salary','net_salary','status'] },
  Performance: { endpoint:'/performance/reviews/', fields:[
    ['employee','Employee','employee',true],['period_type','Review period','select',['Monthly','Quarterly','Annual']],
    ['review_date','Review date','date',true],['rating','Rating (1–5)','number',true],['goals','Goals','textarea'],['feedback','Manager feedback','textarea']
  ], columns:['employee_name','period_type','review_date','rating','feedback'] }
}
const labels = {name:'Department',description:'Description',employee_count:'Employees',employee_id:'Employee ID',first_name:'First name',last_name:'Last name',department_name:'Department',designation:'Designation',joining_date:'Joining date',status:'Status',employee_name:'Employee',date:'Date',check_in:'Check-in',check_out:'Check-out',working_hours:'Hours',leave_type:'Leave type',start_date:'From',end_date:'To',days:'Days',period:'Period',basic_salary:'Basic salary',net_salary:'Net salary',period_type:'Review',review_date:'Review date',rating:'Rating',feedback:'Feedback'}
const money = value => value == null ? '—' : `₹${Number(value).toLocaleString('en-IN')}`
const blankForm = fields => Object.fromEntries(fields.map(([key,,type])=>[key, type==='number'?'': '']))

export default function ModulePage({ title, user }) {
  const cfg = config[title]
  const [rows,setRows] = useState([])
  const [employees,setEmployees] = useState([])
  const [departments,setDepartments] = useState([])
  const [attendanceSummary,setAttendanceSummary] = useState([])
  const [summaryMonth,setSummaryMonth] = useState(new Date().toISOString().slice(0,7))
  const [loading,setLoading] = useState(true)
  const [error,setError] = useState('')
  const [search,setSearch] = useState('')
  const [modal,setModal] = useState(false)
  const [editing,setEditing] = useState(null)
  const [form,setForm] = useState({})
  const [saving,setSaving] = useState(false)
  const [fromDate,setFromDate] = useState('')
  const [toDate,setToDate] = useState('')

  async function load() {
    if (!cfg) { setLoading(false); return }
    setLoading(true); setError('')
    try {
      const {data} = await api.get(`${cfg.endpoint}?page_size=5000`)
      setRows(data.results || data || [])
      if (['Employees','Attendance','Leave Management','Payroll','Performance'].includes(title)) {
        const emp = await api.get('/employees/records/?page_size=5000')
        setEmployees(emp.data.results || emp.data || [])
      }
      if (title === 'Leave Management') {
        const att = await api.get('/attendance/records/?page_size=5000')
        setAttendanceSummary(att.data.results || att.data || [])
      }
      if (title === 'Employees' || title === 'Holidays') {
        const dep = await api.get('/employees/departments/?page_size=5000')
        setDepartments(dep.data.results || dep.data || [])
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load records. Check backend permissions and server status.')
    } finally { setLoading(false) }
  }
  useEffect(()=>{ load() },[title])

  const visible = useMemo(()=>rows.filter(r=>{
    const match = JSON.stringify(r).toLowerCase().includes(search.toLowerCase())
    const date = r.date || r.joining_date || r.review_date || (r.period ? `${r.period}-01` : '')
    const after = !fromDate || (date && date >= fromDate)
    const before = !toDate || (date && date <= toDate)
    return match && after && before
  }),[rows,search,fromDate,toDate])

  function openCreate() { setEditing(null); setForm(blankForm(cfg.fields)); setModal(true) }
  function openEdit(row) {
    setEditing(row)
    const initial = {...row}
    cfg.fields.forEach(([key,,type])=>{
      if (type==='date' && initial[key]) initial[key]=String(initial[key]).slice(0,10)
      if (type==='month' && initial[key]) initial[key]=String(initial[key]).slice(0,7)
      if (initial[key] == null) initial[key]=''
    })
    setForm(initial); setModal(true)
  }
  function fieldValue(key,value) { setForm(prev=>({...prev,[key]:value,...(key==='scope'&&value==='All'?{department:''}:{})})) }

  async function save(e) {
    e.preventDefault(); setSaving(true); setError('')


const payload = {...form};

// Attendance handling
if (
  title === 'Attendance' &&
  ['Absent', 'On Leave', 'Holiday'].includes(payload.status)
) {
  payload.check_in = null;
  payload.check_out = null;
  payload.working_hours = 0;
}

// Holiday handling
if (title === 'Holidays') {
  if (payload.scope === 'All') {
    payload.department = null;
  } else if (!payload.department) {
    setError('Please select a department for department-specific holidays.');
    setSaving(false);
    return;
  }
}

// Convert number fields and remove other empty fields
cfg.fields.forEach(([key, , type]) => {
  if (type === 'number' && payload[key] !== '') {
    payload[key] = Number(payload[key]);
  }

  if (payload[key] === '' && !(title === 'Holidays' && key === 'department')) {
    delete payload[key];
  }
});



    try {
      if (editing) await api.patch(`${cfg.endpoint}${editing.id}/`,payload)
      else await api.post(cfg.endpoint,payload)
      setModal(false); await load()
    } catch (e) {
      const d=e.response?.data
      setError(typeof d==='string'?d: d?.detail || Object.entries(d||{}).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(', '):v}`).join(' | ') || 'Unable to save record.')
    } finally { setSaving(false) }
  }
  async function remove(row) {
    if (!window.confirm('Delete this record? This action cannot be undone.')) return
    try { await api.delete(`${cfg.endpoint}${row.id}/`); await load() }
    catch(e) { setError(e.response?.data?.detail || 'Unable to delete this record. It may be linked to other records.') }
  }
  async function createEmployeeLogin(row) {
    if (row.user) { setError("This employee already has a login account."); return; }
    const username = window.prompt(`Choose a username for ${row.first_name} ${row.last_name}:`, row.email.split("@")[0]);
    if (!username) return;
    const temporary_password = window.prompt("Set a temporary password (at least 8 characters):");
    if (!temporary_password) return;
    try {
      await api.post(`/employees/records/${row.id}/create-login/`, { username, temporary_password });
      window.alert(`Login created. Username: ${username}
Share the temporary password privately with the employee.`);
      await load();
    } catch (e) {
      const d=e.response?.data;
      setError(d?.detail || Object.entries(d||{}).map(([k,v])=>`${k}: ${Array.isArray(v)?v.join(", "):v}`).join(" | ") || "Could not create employee login.");
    }
  }

  async function updateLeave(row,status) {
    let hr_remarks = row.hr_remarks || ''
    if (status === 'Cancelled') {
      hr_remarks = window.prompt('Enter the cancellation reason:', '') 
      if (hr_remarks === null) return
      if (!hr_remarks.trim()) { setError('Please provide a cancellation reason.'); return }
    }
    if (status === 'Rejected') {
      hr_remarks = window.prompt('Enter the rejection reason:', row.hr_remarks || '')
      if (hr_remarks === null) return
      if (!hr_remarks.trim()) { setError('Please provide a rejection reason.'); return }
    }
    try { await api.patch(`${cfg.endpoint}${row.id}/`,{status, hr_remarks}); await load() }
    catch(e) { setError(e.response?.data?.detail || 'Could not update leave status.') }
  }
  function exportCsv() {
    const cols=cfg.columns
    const csv=[cols.map(c=>labels[c]||c).join(','),...visible.map(r=>cols.map(c=>`"${String(r[c]??'').replaceAll('"','""')}"`).join(','))].join('\\n')
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'})
    const url=URL.createObjectURL(blob); const a=document.createElement('a');a.href=url;a.download=`${title.toLowerCase().replaceAll(' ','_')}.csv`;a.click();URL.revokeObjectURL(url)
  }
  if (!cfg) return <div className="page-heading"><div><p className="eyebrow">HR WORKSPACE</p><h1>{title}</h1><p className="muted">Organization profile and access settings are managed by administrators.</p></div></div>

  return <div>
    <div className="page-heading"><div><p className="eyebrow">HR WORKSPACE</p><h1>{title}</h1><p className="muted">{title==='Leave Management'?'Review employee-submitted leave requests and approve or reject them.':title==='Holidays'?'Publish company-wide and department-specific holidays for employees.':`Manage and review your ${title.toLowerCase()} records.`}</p></div>
      <div className="heading-actions"><button className="secondary-btn" onClick={load}><RefreshCw size={16}/> Refresh</button>{title!=='Leave Management'&&<button className="primary-btn" onClick={openCreate}><Plus size={17}/> Add {title==='Departments'?'Department':title==='Employees'?'Employee':title==='Attendance'?'Attendance':title==='Payroll'?'Payroll':title==='Performance'?'Review':title==='Holidays'?'Holiday':'Leave'}</button>}</div>
    </div>
    {error && <div className="error-banner">{error}</div>}
    {title==='Leave Management' && <section className="panel" style={{padding:18,marginBottom:16}}><div className="panel-head"><div><h3>Monthly attendance absence summary</h3><p className="muted">Absences are calculated from Attendance records; these are not approved leave requests.</p></div><input className="date-filter" type="month" value={summaryMonth} onChange={e=>setSummaryMonth(e.target.value)}/></div><div className="table-scroll"><table><thead><tr><th>Employee</th><th>Absent days</th><th>On leave days</th><th>Total recorded days away</th></tr></thead><tbody>{employees.map(emp=>{const records=attendanceSummary.filter(a=>String(a.employee)===String(emp.id) && String(a.date||'').slice(0,7)===summaryMonth);const absent=records.filter(a=>a.status==='Absent').length;const leave=records.filter(a=>a.status==='On Leave').length;return <tr key={emp.id}><td>{emp.first_name} {emp.last_name}</td><td>{absent}</td><td>{leave}</td><td>{absent+leave}</td></tr>})}{!employees.length&&<tr><td colSpan="4" className="empty">No employees available.</td></tr>}</tbody></table></div></section>}
    <div className="panel table-panel">
      <div className="toolbar"><div className="toolbar-left"><div className="search-box"><Search size={17}/><input placeholder={`Search ${title.toLowerCase()}…`} value={search} onChange={e=>setSearch(e.target.value)}/></div>
      {(title==='Attendance'||title==='Employees'||title==='Payroll')&&<><input className="date-filter" aria-label="From date" type="date" value={fromDate} onChange={e=>setFromDate(e.target.value)}/><input className="date-filter" aria-label="To date" type="date" value={toDate} onChange={e=>setToDate(e.target.value)}/></>}</div>
      <div className="toolbar-right"><span className="muted">{visible.length} records</span><button className="icon-btn export-btn" title="Export CSV" onClick={exportCsv}><Download size={16}/></button></div></div>
      {loading?<div className="empty">Loading records…</div>:<div className="table-scroll"><table><thead><tr>{cfg.columns.map(c=><th key={c}>{labels[c]||c}</th>)}<th>Actions</th></tr></thead><tbody>
        {visible.map(row=><tr key={row.id}>{cfg.columns.map(c=><td key={c}>{title==='Attendance' && ['Absent','On Leave','Holiday'].includes(row.status) && ['check_in','check_out','working_hours'].includes(c)?'—':c==='basic_salary'||c==='net_salary'?money(row[c]):c==='status'?<span className={`status ${row[c]==='Active'||row[c]==='Present'||row[c]==='Paid'||row[c]==='Approved'?'active':'pending'}`}>{row[c]||'—'}</span>:row[c]??'—'}</td>)}<td><div className="row-actions">{title==='Employees'&&!row.user&&<button className="icon-btn" title="Create employee login" onClick={()=>createEmployeeLogin(row)}><KeyRound size={15}/></button>}{title==='Leave Management'? (row.status==='Pending'?<><button className="icon-btn approve" title="Approve request" onClick={()=>updateLeave(row,'Approved')}><Check size={15}/></button><button className="icon-btn reject" title="Reject request" onClick={()=>updateLeave(row,'Rejected')}><X size={15}/></button><button className="icon-btn danger-icon" title="Cancel request" onClick={()=>updateLeave(row,'Cancelled')}><Trash2 size={15}/></button></>:row.status==='Approved'?<button className="icon-btn danger-icon" title="Cancel approved leave" onClick={()=>updateLeave(row,'Cancelled')}><X size={15}/></button>:<span className="muted">Reviewed</span>):<><button className="icon-btn" title="Edit" onClick={()=>openEdit(row)}><Pencil size={15}/></button><button className="icon-btn danger-icon" title="Delete" onClick={()=>remove(row)}><Trash2 size={15}/></button></>}</div></td></tr>)}
        {!visible.length&&<tr><td className="empty" colSpan={cfg.columns.length+1}>{rows.length?'No matching records found.':title==='Leave Management'?'No employee leave requests have been submitted yet.':'No records yet. Use the Add button to create your first record.'}</td></tr>}
      </tbody></table></div>}
    </div>
    {modal&&title!=='Leave Management'&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal(false)}}><div className="form-modal"><div className="modal-head"><div><h2>{editing?'Edit':'Add'} {title==='Departments'?'Department':title==='Departments'?'Department':title==='Employees'?'Employee':title==='Attendance'?'Attendance':title==='Payroll'?'Payroll record':title==='Performance'?'Performance review':title==='Holidays'?'Holiday':'Leave request'}</h2><p className="muted">Enter the details below and save your changes.</p></div><button className="icon-btn" onClick={()=>setModal(false)}><X/></button></div>
      <form onSubmit={save}><div className="form-grid">{cfg.fields.map(([key,label,type,extra])=><div className={`form-field ${type==='textarea'?'wide':''}`} key={key}><label>{label}{extra===true&&<span className="required"> *</span>}</label>
        {key==='phone'?<input type="tel" inputMode="numeric" maxLength={10} pattern="[0-9]{10}" title="Enter exactly 10 digits" value={form[key]??''} onChange={e=>fieldValue(key,e.target.value.replace(/\D/g,'').slice(0,10))} />
        :type==='select'?<select required={extra===true} value={form[key]??''} onChange={e=>fieldValue(key,e.target.value)}><option value="">Select {label.toLowerCase()}</option>{extra.map(v=><option key={v} value={v}>{v}</option>)}</select>
        :type==='employee'?<select required value={form[key]??''} onChange={e=>fieldValue(key,e.target.value)}><option value="">Select employee</option>{employees.map(emp=><option key={emp.id} value={emp.id}>{emp.employee_id} — {emp.first_name} {emp.last_name}</option>)}</select>
        :type==='department'?<select value={form[key]??''} onChange={e=>fieldValue(key,e.target.value)}><option value="">Select department</option>{departments.map(dep=><option key={dep.id} value={dep.id}>{dep.name}</option>)}</select>
        :type==='time' && title==='Attendance' && ['Absent','On Leave','Holiday'].includes(form.status)?null
        :type==='textarea'?<textarea rows="3" required={extra===true} value={form[key]??''} onChange={e=>fieldValue(key,e.target.value)}/>
        :<input type={type==='month'?'month':type} required={extra===true} min={key==='rating'?1:undefined} max={key==='rating'?5:undefined} step={type==='number'?'0.01':undefined} value={form[key]??''} onChange={e=>fieldValue(key,e.target.value)}/>}
      </div>)}</div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={()=>setModal(false)}>Cancel</button><button className="primary-btn" disabled={saving}>{saving?'Saving…':'Save record'}</button></div></form>
    </div></div>}
  </div>
}
  