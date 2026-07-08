import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'
import { listUsers, createUser, userAction, listRoles } from '../api.js'

export default function UsersView() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ name: '', email: '', role: 'Transcription Clerk', password: '' })
  const [error, setError] = useState(null)
  const [pwFor, setPwFor] = useState(null) // { id, value } while resetting a password

  async function refresh() {
    try {
      const [u, r] = await Promise.all([listUsers(), listRoles()])
      setUsers(u)
      setRoles(r)
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { refresh() }, [])

  async function run(fn) {
    setError(null)
    try {
      await fn()
      await refresh()
      return true
    } catch (e) {
      setError(e.message)
      return false
    }
  }

  async function create(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) return
    const ok = await run(() => createUser(form))
    if (ok) setForm({ name: '', email: '', role: form.role, password: '' })
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">User Accounts</h1>
        <p className="page-sub">Create, modify and deactivate accounts. Every change is recorded in the audit log.</p>
      </div>

      {error && <div className="preview-banner" style={{ color: 'var(--red)', borderColor: 'rgba(240,101,90,0.4)', background: 'var(--red-soft)' }}>{error}</div>}

      <div className="card">
        <form className="inline-form" onSubmit={create}>
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((r) => <option key={r.id}>{r.name}</option>)}
          </select>
          <input placeholder="Initial password" type="password" autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn small" type="submit"><Icon name="plus" size={14} /> Add user</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  <td className="muted">{u.email}</td>
                  <td>
                    <select
                      className="class-select" value={u.role}
                      onChange={(e) => run(() => userAction(u.id, 'setRole', { role: e.target.value }))}
                    >
                      {roles.map((r) => <option key={r.id}>{r.name}</option>)}
                    </select>
                  </td>
                  <td>
                    {u.active
                      ? <span className="badge green">Active</span>
                      : <span className="badge grey">Deactivated</span>}
                  </td>
                  <td className="muted mono">{u.lastLogin}</td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {pwFor && pwFor.id === u.id ? (
                      <span style={{ display: 'inline-flex', gap: 6 }}>
                        <input
                          type="password" placeholder="New password" autoFocus
                          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, width: 150 }}
                          value={pwFor.value} onChange={(e) => setPwFor({ ...pwFor, value: e.target.value })}
                        />
                        <button className="btn small" onClick={async () => {
                          const ok = await run(() => userAction(u.id, 'setPassword', { password: pwFor.value }))
                          if (ok) setPwFor(null)
                        }}>Set</button>
                        <button className="btn secondary small" onClick={() => setPwFor(null)}>✕</button>
                      </span>
                    ) : (
                      <>
                        <button className="btn secondary small" onClick={() => setPwFor({ id: u.id, value: '' })}>
                          Reset password
                        </button>{' '}
                        {u.active ? (
                          <button className="btn danger-ghost small" onClick={() => run(() => userAction(u.id, 'toggle'))}>Deactivate</button>
                        ) : (
                          <button className="btn secondary small" onClick={() => run(() => userAction(u.id, 'toggle'))}>Reactivate</button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
