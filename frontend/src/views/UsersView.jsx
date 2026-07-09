import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'
import { listUsers, createUser, userAction, listRoles } from '../api.js'

export default function UsersView() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({ name: '', email: '', designation: '', role: 'Transcription Clerk', password: '' })
  const [error, setError] = useState(null)
  const [issued, setIssued] = useState(null) // { email, password } shown once after creation
  const [pwFor, setPwFor] = useState(null) // { id, value } while resetting a password
  const [delFor, setDelFor] = useState(null) // user id pending removal confirmation

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

  function generatePassword() {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lower = 'abcdefghijkmnopqrstuvwxyz'
    const digits = '23456789'
    const symbols = '!@#$%&*'
    const all = upper + lower + digits + symbols
    const pick = (set) => set[Math.floor(Math.random() * set.length)]
    let pw = pick(upper) + pick(lower) + pick(digits) + pick(symbols)
    for (let i = 0; i < 10; i++) pw += pick(all)
    setForm({ ...form, password: pw })
  }

  async function create(e) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.password) return
    const ok = await run(() => createUser(form))
    if (ok) {
      setIssued({ email: form.email, password: form.password })
      setForm({ name: '', email: '', designation: '', role: form.role, password: '' })
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">User Accounts</h1>
        <p className="page-sub">Create, modify and deactivate accounts. Every change is recorded in the audit log.</p>
      </div>

      {error && <div className="preview-banner" style={{ color: 'var(--red)', borderColor: 'rgba(240,101,90,0.4)', background: 'var(--red-soft)' }}>{error}</div>}

      {issued && (
        <div className="audit-banner" style={{ flexWrap: 'wrap' }}>
          <Icon name="check" size={15} />
          Account for <b>{issued.email}</b> created. Temporary password:&nbsp;
          <b className="mono" style={{ userSelect: 'all' }}>{issued.password}</b>
          &nbsp;— share it privately; the user must replace it at first sign-in. Shown only once.
          <button className="btn secondary small" style={{ marginLeft: 'auto' }} onClick={() => setIssued(null)}>Dismiss</button>
        </div>
      )}

      <div className="card">
        <form className="inline-form" onSubmit={create}>
          <input placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <input placeholder="Designation (optional)" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {roles.map((r) => <option key={r.id}>{r.name}</option>)}
          </select>
          <input placeholder="Temporary password" type="text" autoComplete="new-password"
            value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button className="btn secondary small" type="button" onClick={generatePassword}>Generate</button>
          <button className="btn small" type="submit"><Icon name="plus" size={14} /> Add user</button>
        </form>
        <p className="muted" style={{ padding: '10px 18px 14px', fontSize: 12, borderBottom: '1px solid var(--border-soft)' }}>
          New accounts receive a temporary password and must set their own private
          password at first sign-in. Five failed sign-ins lock an account for 15 minutes.
        </p>

        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <b>{u.name}</b>
                    {u.designation ? <span className="muted" style={{ display: 'block', fontSize: 11.5 }}>{u.designation}</span> : null}
                  </td>
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
                    {!u.active
                      ? <span className="badge grey">Deactivated</span>
                      : u.pendingFirstLogin
                        ? <span className="badge amber">Pending first sign-in</span>
                        : <span className="badge green">Active</span>}
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
                    ) : delFor === u.id ? (
                      <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12.5, color: 'var(--red)', fontWeight: 600 }}>Remove permanently?</span>
                        <button className="btn danger-ghost small" onClick={async () => {
                          if (await run(() => userAction(u.id, 'delete'))) setDelFor(null)
                        }}>Yes, remove</button>
                        <button className="btn secondary small" onClick={() => setDelFor(null)}>Cancel</button>
                      </span>
                    ) : (
                      <>
                        <button className="btn secondary small" onClick={() => setPwFor({ id: u.id, value: '' })}>
                          Reset password
                        </button>{' '}
                        {u.active ? (
                          <button className="btn secondary small" onClick={() => run(() => userAction(u.id, 'toggle'))}>Deactivate</button>
                        ) : (
                          <button className="btn secondary small" onClick={() => run(() => userAction(u.id, 'toggle'))}>Reactivate</button>
                        )}{' '}
                        <button className="btn danger-ghost small" onClick={() => setDelFor(u.id)}>Remove</button>
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
