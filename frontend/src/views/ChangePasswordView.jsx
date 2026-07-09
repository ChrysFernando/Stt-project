import { useState } from 'react'
import Icon from '../icons.jsx'
import { changePassword } from '../api.js'

export default function ChangePasswordView({ user, onDone }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (busy) return
    if (next !== confirm) {
      setError('The new passwords do not match.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await changePassword(current, next)
      onDone()
    } catch (err) {
      setError(err.message)
    }
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="logo">
          <div className="logo-badge"><Icon name="lock" size={18} /></div>
          <div className="logo-name">
            Set your password
            <small>REQUIRED BEFORE FIRST USE</small>
          </div>
        </div>
        <p className="login-sub">
          Hello {user.name} — your password was set by an administrator, so you must
          choose your own private password before continuing.
        </p>

        <div className="field">
          <label htmlFor="cur">Temporary password (given to you)</label>
          <input id="cur" type="password" autoComplete="current-password"
            value={current} onChange={(e) => setCurrent(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="new">New password</label>
          <input id="new" type="password" autoComplete="new-password"
            value={next} onChange={(e) => setNext(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="cfm">Repeat new password</label>
          <input id="cfm" type="password" autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>

        {error && <p className="upload-note err" style={{ margin: '0 0 12px', textAlign: 'left' }}>{error}</p>}

        <button className="btn" style={{ width: '100%', justifyContent: 'center' }} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Set password & continue'}
        </button>

        <div className="login-foot">
          Minimum 12 characters with upper &amp; lower case, a digit and a symbol.<br />
          Only you will know this password — not even administrators.
        </div>
      </form>
    </div>
  )
}
