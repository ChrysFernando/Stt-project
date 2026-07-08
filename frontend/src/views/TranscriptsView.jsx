import { useEffect, useState } from 'react'
import Icon from '../icons.jsx'

const TIER_COLOR = { Public: 'green', Restricted: 'amber', Confidential: 'red' }
const TIERS = ['All', 'Public', 'Restricted', 'Confidential']

function fmtDuration(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60), s = sec % 60
  return m ? `${m}m ${s}s` : `${s}s`
}

export default function TranscriptsView({ jobs, onOpen, onRefresh }) {
  const [query, setQuery] = useState('')
  const [tier, setTier] = useState('All')

  // Poll while any job is processing so status flips without manual refresh.
  useEffect(() => {
    if (!jobs.some((j) => j.status === 'processing')) return
    const t = setInterval(onRefresh, 1000)
    return () => clearInterval(t)
  }, [jobs, onRefresh])

  const q = query.trim().toLowerCase()
  const shown = jobs.filter((j) => {
    if (tier !== 'All' && j.classification !== tier) return false
    if (!q) return true
    return (
      j.fileName.toLowerCase().includes(q) ||
      j.segments.some((s) => s.text.toLowerCase().includes(q))
    )
  })

  return (
    <div>
      <div className="page-head">
        <h1 className="page-title">Transcripts</h1>
        <p className="page-sub">Search by file name or spoken content, filter by classification.</p>
      </div>

      <div className="list-tools">
        <div className="search-box">
          <Icon name="search" size={15} />
          <input
            placeholder="Search transcripts… (file name or spoken text)"
            value={query} onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {TIERS.map((t) => (
          <button key={t} className={`chip-btn ${tier === t ? 'on' : ''}`} onClick={() => setTier(t)}>
            {t}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="card empty">
          <p>No transcripts match. Try a different search or upload a new file.</p>
        </div>
      ) : (
        <div className="job-list">
          {shown.map((job) => (
            <div key={job.id} className="card job-card">
              <div className="job-icon"><Icon name="mic" size={18} /></div>
              <div className="job-main">
                <div className="job-name">{job.fileName}</div>
                <div className="job-meta">
                  {job.createdAt} · {job.language}{job.duration ? ` · ${fmtDuration(job.duration)}` : ''}
                </div>
              </div>
              <span className={`badge ${TIER_COLOR[job.classification]}`}>{job.classification}</span>
              {job.status === 'processing' ? (
                <span className="badge amber"><span className="spinner" /> Transcribing…</span>
              ) : job.status === 'failed' ? (
                <span className="badge red" title={job.error || 'Transcription failed'}>Failed</span>
              ) : (
                <>
                  <span className="badge green"><Icon name="check" size={12} /> Completed</span>
                  <button className="btn small" onClick={() => onOpen(job.id)}>Open</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
