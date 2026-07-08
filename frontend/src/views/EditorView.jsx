import { useEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { getJobById, saveSegments, setClassification, normalizedOf, logEvent } from '../api.js'
import { exportTxt, exportSrt, exportDocx, exportPdf } from '../exports.js'

const TIER_COLOR = { Public: 'green', Restricted: 'amber', Confidential: 'red' }

function formatTime(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function EditorView({ user, jobId, onBack }) {
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [segments, setSegments] = useState([])
  const [tier, setTier] = useState('Restricted')
  const [mode, setMode] = useState('raw') // 'raw' | 'normalized'
  const [currentTime, setCurrentTime] = useState(0)
  const [savedFlash, setSavedFlash] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    getJobById(jobId).then((j) => {
      setJob(j)
      if (j) {
        setSegments(j.segments.map((s) => ({ ...s })))
        setTier(j.classification || 'Restricted')
      }
      setLoading(false)
    })
  }, [jobId])

  useEffect(() => {
    if (!savedFlash) return
    const t = setTimeout(() => setSavedFlash(false), 2000)
    return () => clearTimeout(t)
  }, [savedFlash])

  if (loading) {
    return <p className="muted" style={{ padding: 20 }}>Loading transcript…</p>
  }
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

  function doExport(format) {
    if (format === 'TXT') exportTxt(job, segments, textOf)
    if (format === 'SRT') exportSrt(job, segments, textOf)
    if (format === 'DOCX') exportDocx(job, segments, textOf, tier)
    if (format === 'PDF') exportPdf(job, segments, textOf, tier)
    logEvent(user.name, 'Export', `${job.fileName} → ${format}`)
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
          <button className="btn secondary small" onClick={() => doExport('TXT')}><Icon name="download" size={14} /> TXT</button>
          <button className="btn secondary small" onClick={() => doExport('DOCX')}><Icon name="download" size={14} /> DOCX</button>
          <button className="btn secondary small" onClick={() => doExport('PDF')}><Icon name="download" size={14} /> PDF</button>
          <button className="btn secondary small" onClick={() => doExport('SRT')}><Icon name="download" size={14} /> SRT</button>
          <button className="btn small" onClick={handleSave}>Save changes</button>
        </div>
      </div>

      <div className="card player">
        {job.audioUrl ? (
          <audio
            ref={audioRef} src={job.audioUrl} controls
            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
            onLoadedMetadata={(e) => {
              // Fresh browser recordings (webm) report Infinity duration and
              // refuse to seek; forcing a far seek makes Chrome compute the
              // real duration so timestamp clicks work.
              const a = e.target
              if (a.duration === Infinity) {
                a.currentTime = 1e7
                a.ontimeupdate = () => {
                  a.ontimeupdate = null
                  a.currentTime = 0
                }
              }
            }}
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
