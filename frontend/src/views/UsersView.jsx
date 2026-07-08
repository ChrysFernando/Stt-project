import { useState } from 'react'
import Icon from '../icons.jsx'
import { listUsers, addUser, toggleUser, listRoles } from '../api.js'

export default function UsersView({ user }) {
  const [users, setUsers] = useState(listUsers())
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('Transcription Clerk')
  const roles = listRoles()

  function create(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    addUser(name.trim(), email.trim(), role, user.name)
    setUsers(listUsers())
    setName(''); setEmail('')
  }

  function toggle(id) {
    toggleUser(id, user.name)
    setUsers(listUsers())
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">User Accounts</h1>
        <p className="page-sub">Create, modify and deactivate accounts. Every change is recorded in the audit log.</p>
      </div>

      <div className="card">
        <form className="inline-form" onSubmit={create}>
          <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => <option key={r.id}>{r.name}</option>)}
          </select>
          <button className="btn small" type="submit"><Icon name="plus" size={14} /> Add user</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td><b>{u.name}</b></td>
                  <td className="muted">{u.email}</td>
                  <td><span className="badge blue">{u.role}</span></td>
                  <td>
                    {u.active
                      ? <span className="badge green">Active</span>
                      : <span className="badge grey">Deactivated</span>}
                  </td>
                  <td className="muted mono">{u.lastLogin}</td>
                  <td style={{ textAlign: 'right' }}>
                    {u.active ? (
                      <button className="btn danger-ghost small" onClick={() => toggle(u.id)}>Deactivate</button>
                    ) : (
                      <button className="btn secondary small" onClick={() => toggle(u.id)}>Reactivate</button>
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
