import { useEffect } from 'react'

export default function JobsView({ jobs, onOpen, onRefresh }) {
  // Poll while any job is still processing so the status flips to
  // "Completed" without a manual refresh.
  useEffect(() => {
    const anyProcessing = jobs.some((j) => j.status === 'processing')
    if (!anyProcessing) return
    const t = setInterval(onRefresh, 1000)
    return () => clearInterval(t)
  }, [jobs, onRefresh])

  return (
    <div>
      <h1 className="page-title">My Transcripts</h1>
      <p className="page-sub">Open a completed transcript to review, edit and export it.</p>

      {jobs.length === 0 ? (
        <div className="card empty">
          <div className="dropzone-icon">📄</div>
          <p>No transcripts yet. Upload an audio file to get started.</p>
        </div>
      ) : (
        <div className="job-list">
          {jobs.map((job) => (
            <div key={job.id} className="card job-card">
              <div className="job-icon">🎙</div>
              <div className="job-main">
                <div className="job-name">{job.fileName}</div>
                <div className="job-meta">
                  {job.createdAt} · {job.language}
                  {job.duration ? ` · ${job.duration}s` : ''}
                </div>
              </div>

              {job.status === 'processing' ? (
                <span className="status processing">
                  <span className="spinner" /> Transcribing…
                </span>
              ) : (
                <>
                  <span className="status completed">✓ Completed</span>
                  <button className="btn small" onClick={() => onOpen(job.id)}>
                    Open
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
