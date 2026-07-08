import { useEffect, useMemo, useRef, useState } from 'react'
import { getJob, saveSegments } from '../api.js'

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function EditorView({ jobId, onBack }) {
  const job = useMemo(() => getJob(jobId), [jobId])
  const [segments, setSegments] = useState(job ? job.segments.map((s) => ({ ...s })) : [])
  const [currentTime, setCurrentTime] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 2000)
    return () => clearTimeout(t)
  }, [savedFlash])

  if (!job) {
    return (
      <div>
        <button className="btn secondary small" onClick={onBack}>← Back</button>
        <p style={{ marginTop: 16 }}>Transcript not found.</p>
      </div>
    )
  }

  // Give each distinct speaker a stable colour.
  const speakerNames = [...new Set(segments.map((s) => s.speaker))]
  const speakerColor = (name) => `sp-${speakerNames.indexOf(name) % 5}`

  function seekTo(time) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    audio.play()
  }

  function updateText(id, text) {
    setSegments((segs) => segs.map((s) => (s.id === id ? { ...s, text } : s)))
  }

  function renameSpeaker(oldName) {
    const newName = window.prompt(`Rename "${oldName}" everywhere in this transcript:`, oldName)
    if (!newName || newName === oldName) return
    setSegments((segs) => segs.map((s) => (s.speaker === oldName ? { ...s, speaker: newName } : s)))
  }

  function handleSave() {
    saveSegments(jobId, segments)
    setSavedFlash(true)
  }

  function exportTxt() {
    const lines = segments.map(
      (s) => `[${formatTime(s.start)}] ${s.speaker}: ${s.text}`,
    )
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = job.fileName.replace(/\.[^.]+$/, '') + '_transcript.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const activeId = segments.find((s) => currentTime >= s.start && currentTime < s.end)?.id

  return (
    <div>
      <div className="editor-top">
        <button className="btn secondary small" onClick={onBack}>← Back</button>
        <h1 className="page-title">{job.fileName}</h1>
        <div className="toolbar">
          {savedFlash && <span className="saved-flash">✓ Saved</span>}
          <button className="btn secondary small" onClick={exportTxt}>Export TXT</button>
          <button className="btn secondary small" disabled title="Available when the backend is connected">
            Export DOCX / PDF (soon)
          </button>
          <button className="btn small" onClick={handleSave}>Save Changes</button>
        </div>
      </div>

      <div className="card player">
        {job.audioUrl ? (
          <audio
            ref={audioRef}
            src={job.audioUrl}
            controls
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          />
        ) : (
          <span className="player-note">
            🔇 Sample transcript — upload a real file to get playback here. Timestamps below still show the layout.
          </span>
        )}
      </div>

      <div className="card segments">
        {segments.map((seg) => (
          <div key={seg.id} className={`segment ${seg.id === activeId ? 'active' : ''}`}>
            <div className="seg-side">
              <button className="seg-time" onClick={() => seekTo(seg.start)} title="Play from here">
                ▶ {formatTime(seg.start)}
              </button>
              <br />
              <button
                className={`speaker-tag ${speakerColor(seg.speaker)}`}
                onClick={() => renameSpeaker(seg.speaker)}
                title="Click to rename this speaker"
              >
                {seg.speaker}
              </button>
            </div>
            <div className="seg-text">
              <textarea
                rows={Math.max(1, Math.ceil(seg.text.length / 70))}
                value={seg.text}
                onChange={(e) => updateText(seg.id, e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
