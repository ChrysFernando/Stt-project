import { useEffect, useRef, useState } from 'react'
import Icon from '../icons.jsx'
import { getJobById, saveSegments, setClassification, logEvent } from '../api.js'
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
  const [currentTime, setCurrentTime] = useState(0)
  const [flash, setFlash] = useState(null) // 'saved' | 'copied'
  const [rename, setRename] = useState(null) // { from, to }
  const [speakerMenu, setSpeakerMenu] = useState(null) // segment id with open menu
  const [newSpeaker, setNewSpeaker] = useState(null) // text while adding a new speaker
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
    if (!flash) return
    const t = setTimeout(() => setFlash(null), 2000)
    return () => clearTimeout(t)
  }, [flash])

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
  const textOf = (seg) => seg.text

  function seekTo(time) {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    audio.play()
  }

  function updateText(id, text) {
    setSegments((segs) => segs.map((s) => (s.id === id ? { ...s, text } : s)))
  }

  function assignSpeaker(segId, name) {
    setSegments((segs) => segs.map((s) => (s.id === segId ? { ...s, speaker: name } : s)))
    logEvent(user.name, 'Edit', `Reassigned a block to "${name}" in ${job.fileName}`)
    setSpeakerMenu(null)
    setNewSpeaker(null)
  }

  function applyRename() {
    const to = rename.to.trim()
    if (to && to !== rename.from) {
      setSegments((segs) => segs.map((s) => (s.speaker === rename.from ? { ...s, speaker: to } : s)))
      logEvent(user.name, 'Edit', `Renamed speaker "${rename.from}" to "${to}" in ${job.fileName}`)
    }
    setRename(null)
  }

  function changeTier(t) {
    setTier(t)
    setClassification(jobId, t, user.name)
  }

  function handleSave() {
    saveSegments(jobId, segments, user.name)
    setFlash('saved')
  }

  async function copyAll() {
    const text = segments.map((s) => `[${formatTime(s.start)}] ${s.speaker}: ${s.text}`).join('\n')
    try {
      await navigator.clipboard.writeText(text)
      setFlash('copied')
      logEvent(user.name, 'Export', `${job.fileName} → clipboard`)
    } catch {
      alert('Copy failed — your browser blocked clipboard access.')
    }
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
          <div className="job-meta">{job.createdAt}{job.language ? ` · ${job.language}` : ''}</div>
        </div>
        <div className="toolbar">
          {flash === 'saved' && <span className="saved-flash">✓ Saved</span>}
          {flash === 'copied' && <span className="saved-flash">✓ Copied</span>}
          <select
            className="class-select" value={tier}
            onChange={(e) => changeTier(e.target.value)}
            title="Data classification"
            style={{ color: `var(--${TIER_COLOR[tier]})` }}
          >
            <option>Public</option>
            <option>Restricted</option>
            <option>Confidential</option>
          </select>
          <button className="btn secondary small" onClick={copyAll} title="Copy the whole transcript — paste into Word, Notepad or any app">
            Copy all
          </button>
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
            Audio playback is available on the device where this was uploaded.
          </span>
        )}
      </div>

      {rename && (
        <div className="card rename-bar">
          <span>Rename <b className={`speaker-tag ${speakerColor(rename.from)}`}>{rename.from}</b> everywhere:</span>
          <input
            autoFocus value={rename.to}
            onChange={(e) => setRename({ ...rename, to: e.target.value })}
            onKeyDown={(e) => { if (e.key === 'Enter') applyRename(); if (e.key === 'Escape') setRename(null) }}
            placeholder="e.g. Hon. Chairman"
          />
          <button className="btn small" onClick={applyRename}>Apply</button>
          <button className="btn secondary small" onClick={() => setRename(null)}>Cancel</button>
        </div>
      )}

      <div className="card segments">
        {segments.map((seg) => (
          <div key={seg.id} className={`segment ${seg.id === activeId ? 'active' : ''}`}>
            <div className="seg-side">
              <button className="seg-time" onClick={() => seekTo(seg.start)} title="Play from here">
                <Icon name="play" size={10} /> {formatTime(seg.start)}
              </button>
              <br />
              <button
                className={`speaker-tag editable ${speakerColor(seg.speaker)}`}
                onClick={() => { setSpeakerMenu(speakerMenu === seg.id ? null : seg.id); setNewSpeaker(null) }}
                title="Tap to change or rename this speaker"
              >
                {seg.speaker} <Icon name="edit" size={10} />
              </button>
              {speakerMenu === seg.id && (
                <div className="speaker-menu">
                  <div className="sm-label">This block is spoken by</div>
                  {speakerNames.map((n) => (
                    <button
                      key={n}
                      className={`sm-item ${n === seg.speaker ? 'current' : ''}`}
                      onClick={() => n !== seg.speaker && assignSpeaker(seg.id, n)}
                    >
                      {n} {n === seg.speaker ? '✓' : ''}
                    </button>
                  ))}
                  {newSpeaker === null ? (
                    <button className="sm-item" onClick={() => setNewSpeaker('')}>+ New speaker…</button>
                  ) : (
                    <div className="sm-new">
                      <input
                        autoFocus value={newSpeaker} placeholder="Name"
                        onChange={(e) => setNewSpeaker(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && newSpeaker.trim()) assignSpeaker(seg.id, newSpeaker.trim()) }}
                      />
                      <button className="btn small" onClick={() => newSpeaker.trim() && assignSpeaker(seg.id, newSpeaker.trim())}>OK</button>
                    </div>
                  )}
                  <div className="sm-divider" />
                  <button
                    className="sm-item"
                    onClick={() => { setRename({ from: seg.speaker, to: seg.speaker }); setSpeakerMenu(null) }}
                  >
                    ✏ Rename "{seg.speaker}" everywhere
                  </button>
                </div>
              )}
              <span className="lang-tag">{seg.lang}{seg.conf < 0.85 ? <span className="conf-low">LOW CONF</span> : null}</span>
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
