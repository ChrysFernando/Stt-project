import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'
import { listRoles, toggleRolePerm, createRole, PERMISSIONS } from '../api.js'

export default function RolesView() {
  const [roles, setRoles] = useState([])
  const [error, setError] = useState(null)
  const [newName, setNewName] = useState(null) // null = closed, '' = typing

  async function refresh() {
    try { setRoles(await listRoles()) } catch (e) { setError(e.message) }
  }
  useEffect(() => { refresh() }, [])

  async function run(fn) {
    setError(null)
    try { await fn(); await refresh(); return true } catch (e) { setError(e.message); return false }
  }

  return (
    <div>
      <div className="head-row">
        <div className="page-head">
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-sub">Granular, role-based access control — enforced by the server on every request.</p>
        </div>
        {newName === null ? (
          <button className="btn" onClick={() => setNewName('')}><Icon name="plus" size={15} /> New role</button>
        ) : (
          <span style={{ display: 'inline-flex', gap: 8 }}>
            <input
              autoFocus placeholder="Role name"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 12px', fontSize: 13.5 }}
              value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && newName.trim() && await run(() => createRole(newName.trim()))) setNewName(null)
                if (e.key === 'Escape') setNewName(null)
              }}
            />
            <button className="btn small" onClick={async () => {
              if (newName.trim() && await run(() => createRole(newName.trim()))) setNewName(null)
            }}>Create</button>
            <button className="btn secondary small" onClick={() => setNewName(null)}>✕</button>
          </span>
        )}
      </div>

      {error && <div className="preview-banner" style={{ color: 'var(--red)', borderColor: 'rgba(240,101,90,0.4)', background: 'var(--red-soft)' }}>{error}</div>}

      <div className="role-grid">
        {roles.map((r) => (
          <div key={r.id} className="card role-card">
            <h3><Icon name="shield" size={15} /> {r.name}</h3>
            <p className="muted">{r.builtIn ? 'Built-in role' : 'Custom role'} · {r.perms.length} permissions</p>
            {PERMISSIONS.map((p) => {
              const granted = r.perms.includes(p)
              return (
                <div key={p} className={`perm-row ${granted ? 'granted' : ''}`}>
                  {p}
                  <label className="switch">
                    <input
                      type="checkbox" checked={granted}
                      disabled={r.name === 'Administrator'}
                      onChange={() => run(() => toggleRolePerm(r.id, p))}
                      aria-label={`${p} for ${r.name}`}
                    />
                    <span className="track" />
                  </label>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
