import Icon from '../icons.jsx'
import { getStats, listAudit } from '../api.js'

const ACTION_COLOR = { Login: 'blue', Upload: 'blue', Edit: 'amber', Export: 'green', View: 'grey', Admin: 'red' }

export default function DashboardView({ user, goto, jobCount }) {
  const stats = getStats(jobCount)
  const recent = listAudit().slice(0, 7)

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Welcome back, {user.name}</h1>
        <p className="page-sub">Voice Capturing System — operational overview</p>
      </div>

      <div className="stat-grid">
        <div className="card stat">
          <div className="lbl">TRANSCRIPTS</div>
          <div className="k">{stats.transcripts}</div>
          <div className="note">across all classifications</div>
        </div>
        <div className="card stat">
          <div className="lbl">AUDIO PROCESSED</div>
          <div className="k">{stats.audioHours} h</div>
          <div className="note">Sinhala · English · mixed</div>
        </div>
        <div className="card stat">
          <div className="lbl">AVG MODEL CONFIDENCE</div>
          <div className="k">{stats.avgConfidence}</div>
          <div className="note">last 30 days</div>
        </div>
        <div className="card stat">
          <div className="lbl">ACTIVE USERS</div>
          <div className="k">{stats.activeUsers}</div>
          <div className="note">role-based access enforced</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card">
          <div className="panel-title"><Icon name="list" size={15} /> Recent activity</div>
          <ul className="activity">
            {recent.map((e) => (
              <li key={e.id}>
                <time>{e.time}</time>
                <span className={`badge ${ACTION_COLOR[e.action] || 'grey'}`}>{e.action}</span>
                <span className="muted">{e.user} — {e.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="card quick">
          <div className="panel-title" style={{ padding: '0 0 12px', border: 'none' }}>
            <Icon name="upload" size={15} /> Quick actions
          </div>
          <button className="btn" onClick={() => goto('upload')}>
            <Icon name="upload" size={15} /> Upload new audio
          </button>
          <button className="btn secondary" onClick={() => goto('transcripts')}>
            <Icon name="file" size={15} /> Review transcripts
          </button>
          <p>
            Uploads are encrypted at rest (AES-256), processed inside the approved
            jurisdiction, and never used for AI model training.
          </p>
        </div>
      </div>
    </div>
  )
}
