import { useEffect, useMemo, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { getJob, saveSegments, setClassification, normalizedOf, logEvent } from '../api.js'

const TIER_COLOR = { Public: 'green', Restricted: 'amber', Confidential: 'red' }

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function EditorView({ user, jobId, onBack }) {
  const job = useMemo(() => getJob(jobId), [jobId])
  const [segments, setSegments] = useState(job ? job.segments.map((s) => ({ ...s })) : [])
  const [tier, setTier] = useState(job ? job.classification : 'Restricted')
  const [mode, setMode] = useState('raw') // 'raw' | 'normalized'
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

  function changeTier(t) {
    setTier(t)
    setClassification(jobId, t, user.name)
  }

  function handleSave() {
    saveSegments(jobId, segments, user.name)
    setSavedFlash(true)
  }

  function textOf(seg) {
    return mode === 'raw' ? seg.text : normalizedOf(seg)
  }

  function download(content, mime, filename) {
    const blob = new Blob([content], { type: mime })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const baseName = job.fileName.replace(/\.[^.]+$/, '')

  function exportTxt() {
    const lines = segments.map((s) => `[${formatTime(s.start)}] ${s.speaker}: ${textOf(s)}`)
    download('﻿' + lines.join('\n'), 'text/plain;charset=utf-8', `${baseName}_transcript.txt`)
    logEvent(user.name, 'Export', `${job.fileName} → TXT`)
  }

  function exportDocx() {
    // Word opens HTML saved with a .doc extension; keeps export fully client-side for the demo.
    const rows = segments.map((s) =>
      `<p><b>${s.speaker}</b> <span style="color:#888">[${formatTime(s.start)}]</span><br/>${textOf(s)}</p>`
    ).join('\n')
    const html = `<html><head><meta charset="utf-8"><title>${job.fileName}</title></head>
      <body style="font-family:'Noto Sans Sinhala','Iskoola Pota',sans-serif;line-height:1.6">
      <h2>${job.fileName}</h2><p style="color:#888">${job.createdAt} · ${job.language} · ${tier}</p>${rows}</body></html>`
    download('﻿' + html, 'application/msword', `${baseName}_transcript.doc`)
    logEvent(user.name, 'Export', `${job.fileName} → DOCX`)
  }

  const activeId = segments.find((s) => currentTime >= s.start && currentTime < s.end)?.id

  return (
    <div>
      <div className="editor-top">
        <button className="btn secondary small" onClick={onBack}>← Back</button>
        <div className="titleblock">
          <h1>{job.fileName}</h1>
          <div className="job-meta">{job.createdAt} · {job.language}</div>
        </div>
        <div className="toolbar">
          {savedFlash && <span className="saved-flash">✓ Saved</span>}
          <select
            className="class-select" value={tier}
            onChange={(e) => changeTier(e.target.value)}
            title="Data classification"
            style={{ color: `var(--${TIER_COLOR[tier] === 'blue' ? 'accent' : TIER_COLOR[tier]})` }}
          >
            <option>Public</option>
            <option>Restricted</option>
            <option>Confidential</option>
          </select>
          <button className="btn secondary small" onClick={exportTxt}><Icon name="download" size={14} /> TXT</button>
          <button className="btn secondary small" onClick={exportDocx}><Icon name="download" size={14} /> DOCX</button>
          <button className="btn secondary small" disabled title="Available when the backend is connected">PDF</button>
          <button className="btn small" onClick={handleSave}>Save changes</button>
        </div>
      </div>

      <div className="card player">
        {job.audioUrl ? (
          <audio
            ref={audioRef} src={job.audioUrl} controls
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
          />
        ) : (
          <span className="player-note">
            Sample transcript — upload a real file to get audio playback here.
          </span>
        )}
      </div>

      <div className="mode-toggle" role="tablist">
        <button className={mode === 'raw' ? 'on' : ''} onClick={() => setMode('raw')}>
          Raw · as spoken
        </button>
        <button className={mode === 'normalized' ? 'on' : ''} onClick={() => setMode('normalized')}>
          Normalized Sinhala
        </button>
      </div>
      <p className="mode-note">
        {mode === 'raw'
          ? 'Exactly what was said, in the languages spoken. Editable.'
          : 'Auto-generated fully-Sinhala rendering of the same speech. Read-only.'}
      </p>

      <div className="card segments">
        {segments.map((seg) => (
          <div key={seg.id} className={`segment ${seg.id === activeId ? 'active' : ''}`}>
            <div className="seg-side">
              <button className="seg-time" onClick={() => seekTo(seg.start)} title="Play from here">
                <Icon name="play" size={10} /> {formatTime(seg.start)}
              </button>
              <br />
              <button
                className={`speaker-tag ${speakerColor(seg.speaker)}`}
                onClick={() => renameSpeaker(seg.speaker)}
                title="Click to rename this speaker"
              >
                {seg.speaker}
              </button>
              <span className="lang-tag">{seg.lang}{seg.conf < 0.85 ? <span className="conf-low">LOW CONF</span> : null}</span>
            </div>
            <div className="seg-text">
              {mode === 'raw' ? (
                <textarea
                  rows={Math.max(1, Math.ceil(seg.text.length / 70))}
                  value={seg.text}
                  onChange={(e) => updateText(seg.id, e.target.value)}
                />
              ) : (
                <div className="ro">{normalizedOf(seg)}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
