import { useState } from 'react'
import Icon from '../icons.jsx'
import { getSettings, saveSettings } from '../api.js'

const STORAGE_MODES = ['On-premises', 'Cloud', 'Hybrid']

export default function SettingsView({ user }) {
  const [s, setS] = useState(getSettings())
  const [savedFlash, setSavedFlash] = useState(false)

  function update(patch) {
    const next = { ...s, ...patch }
    setS(next)
    saveSettings(patch, user.name)
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 1500)
  }

  return (
    <div>
      <div className="head-row">
        <div className="page-head">
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">Session security, deployment and data-protection posture.</p>
        </div>
        {savedFlash && <span className="saved-flash">✓ Saved</span>}
      </div>

      <div className="settings-grid">
        <div className="card settings-card">
          <h3><Icon name="lock" size={15} /> Session security</h3>
          <div className="setting-row">
            <div>Minimum password length<span className="desc">Applies to all new and changed passwords</span></div>
            <input type="number" min="8" max="32" value={s.minPasswordLength}
              onChange={(e) => update({ minPasswordLength: Number(e.target.value) })} />
          </div>
          <div className="setting-row">
            <div>Require mixed case, digits &amp; symbols</div>
            <label className="switch">
              <input type="checkbox" checked={s.requireComplexity}
                onChange={(e) => update({ requireComplexity: e.target.checked })} aria-label="Require password complexity" />
              <span className="track" />
            </label>
          </div>
          <div className="setting-row">
            <div>Session timeout (minutes)<span className="desc">Idle sessions are signed out automatically</span></div>
            <input type="number" min="5" max="240" value={s.sessionTimeoutMins}
              onChange={(e) => update({ sessionTimeoutMins: Number(e.target.value) })} />
          </div>
          <div className="setting-row">
            <div>Max concurrent sessions per user</div>
            <input type="number" min="1" max="5" value={s.maxConcurrentSessions}
              onChange={(e) => update({ maxConcurrentSessions: Number(e.target.value) })} />
          </div>
        </div>

        <div className="card settings-card">
          <h3><Icon name="server" size={15} /> Deployment &amp; storage</h3>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 10 }}>
            Where audio and transcripts are stored and processed.
          </p>
          <div className="radio-row">
            {STORAGE_MODES.map((m) => (
              <button key={m} className={`chip-btn ${s.storageMode === m ? 'on' : ''}`}
                onClick={() => update({ storageMode: m })}>
                {m}
              </button>
            ))}
          </div>
          <div className="setting-row" style={{ marginTop: 12 }}>
            <div>Languages<span className="desc">Recognition coverage</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              <span className="badge green">Sinhala</span>
              <span className="badge green">English</span>
              <span className="badge grey">Tamil — planned</span>
            </div>
          </div>
        </div>

        <div className="card settings-card">
          <h3><Icon name="shield" size={15} /> Data protection</h3>
          <div className="shield-list">
            <div className="shield-item"><Icon name="check" size={15} />
              <div>AES-256 encryption at rest<span>All audio and transcript stores, with managed key rotation</span></div>
            </div>
            <div className="shield-item"><Icon name="check" size={15} />
              <div>TLS 1.2+ in transit<span>Enforced for every network connection</span></div>
            </div>
            <div className="shield-item"><Icon name="check" size={15} />
              <div>Network isolation<span>Data stores and transcription engine on private subnets only</span></div>
            </div>
          </div>
        </div>

        <div className="card settings-card">
          <h3><Icon name="globe" size={15} /> Data sovereignty</h3>
          <div className="shield-list">
            <div className="shield-item"><Icon name="check" size={15} />
              <div>Jurisdiction: Sri Lanka<span>All data, telemetry and audio logs remain within approved borders</span></div>
            </div>
            <div className="shield-item"><Icon name="check" size={15} />
              <div>Client data ownership<span>The Commission holds exclusive ownership of all audio and transcripts</span></div>
            </div>
            <div className="shield-item"><Icon name="check" size={15} />
              <div>No AI training on client data<span>Data is never used for model refinement or analytics by any party</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
