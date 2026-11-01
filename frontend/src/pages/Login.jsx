import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import api from '../api'

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await api.post('/auth/token/', { username, password })
      localStorage.setItem('access', data.access)
      localStorage.setItem('refresh', data.refresh)
      await onLogin()
      navigate('/')
    } catch {
      setError('Invalid username or password. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return <div className="login-page"><div className="login-card">
    <div className="login-brand"><span className="brand-mark">H</span><span>HR<span className="brand-light">Flow</span></span></div>
    <div className="login-icon"><ShieldCheck size={25}/></div>
    <h1>Welcome back</h1><p className="muted">Sign in to your HR workspace</p>
    <form onSubmit={submit}>
      <label>Username or email</label>
      <input value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" placeholder="Enter your username" required/>
      <label>Password</label>
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="Enter your password" required/>
      {error && <div className="error">{error}</div>}
      <button className="primary-btn full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button>
    </form>
    <p className="demo-note">Use the account created by your Django administrator.</p>
  </div></div>
}
