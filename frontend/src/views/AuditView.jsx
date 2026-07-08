import { useState } from 'react'
import Icon from '../icons.jsx'
import { listAudit } from '../api.js'

const ACTIONS = ['All', 'Login', 'Upload', 'View', 'Edit', 'Export', 'Admin']
const ACTION_COLOR = { Login: 'blue', Upload: 'blue', Edit: 'amber', Export: 'green', View: 'grey', Admin: 'red' }

export default function AuditView() {
  const [filter, setFilter] = useState('All')
  const events = listAudit().filter((e) => filter === 'All' || e.action === filter)

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-sub">Complete record of user actions: logins, views, edits, exports and deletions.</p>
      </div>

      <div className="audit-banner">
        <Icon name="lock" size={15} />
        Append-only — entries cannot be edited or deleted, by anyone.
      </div>

      <div className="preview-banner">
        ⚠ Preview — records this session's real actions on this device; the security build makes it permanent and server-wide.
      </div>

      <div className="list-tools">
        {ACTIONS.map((a) => (
          <button key={a} className={`chip-btn ${filter === a ? 'on' : ''}`} onClick={() => setFilter(a)}>
            {a}
          </button>
        ))}
      </div>

      <div className="card table-wrap">
        <table>
          <thead>
            <tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th><th>IP address</th></tr>
          </thead>
          <tbody>
            {events.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                No events yet — actions you take will appear here.
              </td></tr>
            )}
            {events.map((e) => (
              <tr key={e.id}>
                <td className="muted mono">{e.time}</td>
                <td><b>{e.user}</b></td>
                <td><span className={`badge ${ACTION_COLOR[e.action] || 'grey'}`}>{e.action}</span></td>
                <td className="muted">{e.detail}</td>
                <td className="muted mono">{e.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
