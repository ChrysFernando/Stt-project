import { useState } from 'react'
import Icon from '../icons.jsx'

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!email || !password) return
    onLogin({ name: email.split('@')[0], role: 'Administrator' })
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
          <input id="email" type="email" placeholder="name@commission.gov.lk"
            value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="pw">Password</label>
          <input id="pw" type="password" placeholder="••••••••••••"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} type="submit">
          <Icon name="lock" size={15} /> Sign in securely
        </button>

        <div className="login-divider">or use a demo account</div>
        <div className="demo-row">
          <button type="button" className="btn secondary"
            onClick={() => onLogin({ name: 'A. Perera', role: 'Administrator' })}>
            Administrator
          </button>
          <button type="button" className="btn secondary"
            onClick={() => onLogin({ name: 'S. Fernando', role: 'Transcription Clerk' })}>
            Clerk
          </button>
        </div>

        <div className="login-foot">
          Sessions expire after 30 minutes of inactivity · Concurrent logins restricted<br />
          Protected with TLS 1.2+ in transit and AES-256 at rest
        </div>
      </form>
    </div>
  )
}
