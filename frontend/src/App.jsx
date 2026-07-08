import { useState } from 'react'
import UploadView from './views/UploadView.jsx'
import JobsView from './views/JobsView.jsx'
import EditorView from './views/EditorView.jsx'
import { listJobs } from './api.js'

export default function App() {
  const [view, setView] = useState('upload')
  const [jobs, setJobs] = useState(listJobs())
  const [openJobId, setOpenJobId] = useState(null)

  function openTranscript(jobId) {
    setOpenJobId(jobId)
    setView('editor')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-badge">🎙</div>
          <div>
            VoiceScript
            <small>Sinhala Speech-to-Text</small>
          </div>
        </div>

        <button
          className={`nav-item ${view === 'upload' ? 'active' : ''}`}
          onClick={() => setView('upload')}
        >
          ⬆️ Upload Audio
        </button>
        <button
          className={`nav-item ${view === 'jobs' || view === 'editor' ? 'active' : ''}`}
          onClick={() => setView('jobs')}
        >
          📄 My Transcripts
        </button>

        <div className="sidebar-footer">
          Demo mode — transcripts are sample data until the backend is connected.
        </div>
      </aside>

      <main className="content">
        {view === 'upload' && (
          <UploadView
            onUploaded={(updatedJobs) => setJobs(updatedJobs)}
            goToJobs={() => setView('jobs')}
          />
        )}
        {view === 'jobs' && (
          <JobsView jobs={jobs} onOpen={openTranscript} onRefresh={() => setJobs(listJobs())} />
        )}
        {view === 'editor' && openJobId && (
          <EditorView jobId={openJobId} onBack={() => setView('jobs')} />
        )}
      </main>
    </div>
  )
}
