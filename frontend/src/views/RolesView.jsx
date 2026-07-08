import { useState } from 'react'
import Icon from '../icons.jsx'
import { listRoles, togglePermission, addRole, PERMISSIONS } from '../api.js'

export default function RolesView({ user }) {
  const [roles, setRoles] = useState(listRoles())

  function toggle(roleId, perm) {
    togglePermission(roleId, perm, user.name)
    setRoles(listRoles())
  }

  function create() {
    const name = window.prompt('Name for the new role:')
    if (!name || !name.trim()) return
    addRole(name.trim(), user.name)
    setRoles(listRoles())
  }

  return (
    <div>
      <div className="head-row">
        <div className="page-head">
          <h1 className="page-title">Roles &amp; Permissions</h1>
          <p className="page-sub">Granular, role-based access control. Custom roles supported.</p>
        </div>
        <button className="btn" onClick={create}><Icon name="plus" size={15} /> New role</button>
      </div>

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
                      onChange={() => toggle(r.id, p)}
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
