import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'
import { listAudit } from '../api.js'

const ACTIONS = ['All', 'Login', 'Upload', 'View', 'Edit', 'Export', 'Admin']
const ACTION_COLOR = { Login: 'blue', Upload: 'blue', Edit: 'amber', Export: 'green', View: 'grey', Admin: 'red' }

export default function AuditView() {
  const [filter, setFilter] = useState('All')
  const [events, setEvents] = useState([])
  const [error, setError] = useState(null)

  useEffect(() => {
    listAudit().then(setEvents).catch((e) => setError(e.message))
  }, [])

  const shown = events.filter((e) => filter === 'All' || e.action === filter)

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Audit Log</h1>
        <p className="page-sub">Permanent record of all user actions: logins, views, edits, exports and administration.</p>
      </div>

      <div className="audit-banner">
        <Icon name="lock" size={15} />
        Append-only — the system has no code path that can edit or delete these records.
      </div>

      {error && <div className="preview-banner" style={{ color: 'var(--red)', borderColor: 'rgba(240,101,90,0.4)', background: 'var(--red-soft)' }}>{error}</div>}

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
            {shown.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 28 }}>
                No events match.
              </td></tr>
            )}
            {shown.map((e) => (
              <tr key={e.id}>
                <td className="muted mono">{e.time}</td>
                <td><b>{e.user}</b></td>
                <td><span className={`badge ${ACTION_COLOR[e.action] || 'grey'}`}>{e.action}</span></td>
                <td className="muted">{e.detail}</td>
                <td className="muted mono">{e.ip || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
