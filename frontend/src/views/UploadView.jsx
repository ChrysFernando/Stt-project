import { useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { uploadAudio } from '../api.js'

const ACCEPTED = ['.mp3', '.wav', '.mp4', '.m4a']
const TIERS = ['Public', 'Restricted', 'Confidential']

export default function UploadView({ user, onUploaded, goToJobs }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState(null)
  const [tier, setTier] = useState('Restricted')

  async function handleFiles(files) {
    const file = files && files[0]
    if (!file) return
    const ok = ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!ok) {
      setMessage({ type: 'err', text: `"${file.name}" is not a supported format. Please use MP3, WAV, MP4 or M4A.` })
      return
    }
    setMessage({ type: 'ok', text: `Uploading "${file.name}"…` })
    try {
      await uploadAudio(file, tier, user.name, onUploaded)
      setMessage({ type: 'ok', text: `"${file.name}" uploaded as ${tier}. Transcription started…` })
      setTimeout(goToJobs, 900)
    } catch (e) {
      setMessage({ type: 'err', text: e.message })
    }
  }

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Upload Audio</h1>
        <p className="page-sub">Add an audio or video file — speech is converted to a time-aligned transcript.</p>
      </div>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
      >
        <div className="dz-icon"><Icon name="upload" size={26} /></div>
        <h3>Drag &amp; drop your file here</h3>
        <p>or choose a file from your device</p>
        <button className="btn" onClick={() => inputRef.current.click()}>
          <Icon name="plus" size={15} /> Choose file
        </button>
        <input
          ref={inputRef} type="file" accept={ACCEPTED.join(',')} hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="format-chips">
          {ACCEPTED.map((f) => <span key={f} className="chip">{f.replace('.', '').toUpperCase()}</span>)}
        </div>
      </div>

      <div className="upload-opts">
        <div className="card">
          <div className="lbl" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
            Data classification for this upload
          </div>
          <div className="radio-row">
            {TIERS.map((t) => (
              <button key={t} className={`chip-btn ${tier === t ? 'on' : ''}`} onClick={() => setTier(t)}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="lbl" style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8 }}>
            Languages &amp; limits
          </div>
          <p className="muted" style={{ fontSize: 12.5 }}>
            Sinhala, English and Tamil are understood automatically, including switching
            mid-sentence. This deployment accepts files up to <b style={{ color: 'var(--text)' }}>~3 MB</b> (about
            3–5 minutes of MP3); the transcription engine itself handles up to 10-hour
            files — larger uploads unlock with the storage upgrade.
          </p>
        </div>
      </div>

      {message && <p className={`upload-note ${message.type}`}>{message.text}</p>}
    </div>
  )
}
