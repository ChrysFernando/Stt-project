import Icon from '../icons.jsx'
import { listAudit } from '../api.js'

const ACTION_COLOR = { Login: 'blue', Upload: 'blue', Edit: 'amber', Export: 'green', View: 'grey', Admin: 'red' }

function fmtHours(totalSec) {
  if (!totalSec) return '0m'
  const h = Math.floor(totalSec / 3600)
  const m = Math.round((totalSec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

export default function DashboardView({ user, goto, jobs }) {
  const completed = jobs.filter((j) => j.status === 'completed')
  const totalSec = completed.reduce((a, j) => a + (j.duration || 0), 0)
  const confs = completed.flatMap((j) => j.segments.map((s) => s.conf)).filter((c) => typeof c === 'number')
  const avgConf = confs.length ? `${Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 100)}%` : '—'
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
          <div className="k">{jobs.length}</div>
          <div className="note">on this device</div>
        </div>
        <div className="card stat">
          <div className="lbl">AUDIO PROCESSED</div>
          <div className="k">{fmtHours(totalSec)}</div>
          <div className="note">Sinhala · English · mixed</div>
        </div>
        <div className="card stat">
          <div className="lbl">AVG MODEL CONFIDENCE</div>
          <div className="k">{avgConf}</div>
          <div className="note">across your transcripts</div>
        </div>
        <div className="card stat">
          <div className="lbl">ACTIVE USERS</div>
          <div className="k">—</div>
          <div className="note">arrives with server accounts</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card">
          <div className="panel-title"><Icon name="list" size={15} /> Recent activity (this session)</div>
          {recent.length === 0 ? (
            <p className="muted" style={{ padding: '14px 18px', fontSize: 13 }}>
              No activity yet — upload or record something and your actions will appear here.
            </p>
          ) : (
            <ul className="activity">
              {recent.map((e) => (
                <li key={e.id}>
                  <time>{e.time}</time>
                  <span className={`badge ${ACTION_COLOR[e.action] || 'grey'}`}>{e.action}</span>
                  <span className="muted">{e.user} — {e.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card quick">
          <div className="panel-title" style={{ padding: '0 0 12px', border: 'none' }}>
            <Icon name="upload" size={15} /> Quick actions
          </div>
          <button className="btn" onClick={() => goto('upload')}>
            <Icon name="upload" size={15} /> Upload new audio
          </button>
          <button className="btn secondary" onClick={() => goto('record')}>
            <Icon name="mic" size={15} /> Record & dictate
          </button>
          <button className="btn secondary" onClick={() => goto('transcripts')}>
            <Icon name="file" size={15} /> Review transcripts
          </button>
          <p>
            Speech is processed by the transcription engine and returned here;
            transcripts stay on your device until server accounts arrive.
          </p>
        </div>
      </div>
    </div>
  )
}
