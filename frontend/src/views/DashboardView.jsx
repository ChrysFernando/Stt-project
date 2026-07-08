import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'
import { myActivity } from '../api.js'

const ACTION_COLOR = { Login: 'blue', Upload: 'blue', Edit: 'amber', Export: 'green', View: 'grey', Admin: 'red' }

function fmtHours(totalSec) {
  if (!totalSec) return '0m'
  const h = Math.floor(totalSec / 3600)
  const m = Math.round((totalSec % 3600) / 60)
  return h ? `${h}h ${m}m` : `${m}m`
}

export default function DashboardView({ user, goto, jobs }) {
  const [recent, setRecent] = useState([])

  useEffect(() => {
    myActivity().then(setRecent).catch(() => setRecent([]))
  }, [jobs.length])

  const completed = jobs.filter((j) => j.status === 'completed')
  const totalSec = completed.reduce((a, j) => a + (j.duration || 0), 0)
  const confs = completed.flatMap((j) => (j.segments || []).map((s) => s.conf)).filter((c) => typeof c === 'number')
  const avgConf = confs.length ? `${Math.round((confs.reduce((a, b) => a + b, 0) / confs.length) * 100)}%` : '—'

  const can = (p) => user.perms.includes(p)

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
          <div className="note">stored on the server</div>
        </div>
        <div className="card stat">
          <div className="lbl">AUDIO PROCESSED</div>
          <div className="k">{fmtHours(totalSec)}</div>
          <div className="note">Sinhala · English · Tamil · mixed</div>
        </div>
        <div className="card stat">
          <div className="lbl">AVG MODEL CONFIDENCE</div>
          <div className="k">{avgConf}</div>
          <div className="note">across all transcripts</div>
        </div>
        <div className="card stat">
          <div className="lbl">SIGNED IN AS</div>
          <div className="k" style={{ fontSize: 20 }}>{user.role}</div>
          <div className="note">{user.perms.length} permissions</div>
        </div>
      </div>

      <div className="dash-cols">
        <div className="card">
          <div className="panel-title"><Icon name="list" size={15} /> Your recent activity</div>
          {recent.length === 0 ? (
            <p className="muted" style={{ padding: '14px 18px', fontSize: 13 }}>
              No activity recorded yet for this account.
            </p>
          ) : (
            <ul className="activity">
              {recent.slice(0, 8).map((e) => (
                <li key={e.id}>
                  <time>{e.time}</time>
                  <span className={`badge ${ACTION_COLOR[e.action] || 'grey'}`}>{e.action}</span>
                  <span className="muted">{e.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card quick">
          <div className="panel-title" style={{ padding: '0 0 12px', border: 'none' }}>
            <Icon name="upload" size={15} /> Quick actions
          </div>
          {can('Upload audio') && (
            <>
              <button className="btn" onClick={() => goto('upload')}>
                <Icon name="upload" size={15} /> Upload new audio
              </button>
              <button className="btn secondary" onClick={() => goto('record')}>
                <Icon name="mic" size={15} /> Record & dictate
              </button>
            </>
          )}
          {can('View transcripts') && (
            <button className="btn secondary" onClick={() => goto('transcripts')}>
              <Icon name="file" size={15} /> Review transcripts
            </button>
          )}
          <p>
            Transcripts and audio are stored on the server — sign in from any device
            and your work is here.
          </p>
        </div>
      </div>
    </div>
  )
}
