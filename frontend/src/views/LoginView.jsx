import { useState } from 'react'
import Icon from '../icons.jsx'
import { login } from '../api.js'

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email || !password || busy) return
    setBusy(true)
    setError(null)
    try {
      onLogin(await login(email, password))
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">
          <div className="logo-badge"><Icon name="mic" size={18} /></div>
          <div className="logo-name">
            VoiceScript
            <small>SINHALA SPEECH-TO-TEXT</small>
          </div>
        </div>
        <h1 className="login-title">Sign in</h1>
        <p className="login-sub">Voice Capturing System — authorized personnel only</p>

        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" placeholder="name@commission.gov.lk" autoComplete="username"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" placeholder="••••••••••••" autoComplete="current-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p className="upload-note err" style={{ margin: '0 0 12px', textAlign: 'left' }}>{error}</p>}

        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={busy}>
          <Icon name="lock" size={15} /> {busy ? 'Signing in…' : 'Sign in securely'}
        </button>

        <div className="login-foot">
          Sessions expire automatically after inactivity · Concurrent logins restricted<br />
          Every sign-in attempt is recorded in the audit log
        </div>
      </form>
    </div>
  )
}
