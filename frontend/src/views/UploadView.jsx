import { useRef, useState } from 'react'
import { uploadAudio } from '../api.js'

const ACCEPTED = ['.mp3', '.wav', '.mp4', '.m4a']

export default function UploadView({ onUploaded, goToJobs }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [message, setMessage] = useState(null)

  function handleFiles(files) {
    const file = files && files[0]
    if (!file) return

    const ok = ACCEPTED.some((ext) => file.name.toLowerCase().endsWith(ext))
    if (!ok) {
      setMessage({ type: 'error', text: `"${file.name}" is not a supported format. Please use MP3, WAV, MP4 or M4A.` })
      return
    }

    uploadAudio(file, onUploaded)
    setMessage({ type: 'ok', text: `"${file.name}" uploaded. Transcription started…` })
    setTimeout(goToJobs, 900)
  }

  return (
    <div>
      <h1 className="page-title">Upload Audio</h1>
      <p className="page-sub">Add an audio or video file and we will turn the speech into text.</p>

      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <div className="dropzone-icon">🎧</div>
        <h3>Drag & drop your file here</h3>
        <p>or choose a file from your computer</p>
        <button className="btn" onClick={() => inputRef.current.click()}>
          Choose File
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(',')}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="format-chips">
          {ACCEPTED.map((f) => (
            <span key={f} className="chip">{f.replace('.', '').toUpperCase()}</span>
          ))}
        </div>
      </div>

      {message && (
        <p className="upload-note" style={{ color: message.type === 'error' ? '#dc2626' : '#16a34a' }}>
          {message.text}
        </p>
      )}
      <p className="upload-note">
        Supports Sinhala, English and mixed (Singlish) speech.
      </p>
    </div>
  )
}
