import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
import LoginView from './views/LoginView.jsx'
import DashboardView from './views/DashboardView.jsx'
import UploadView from './views/UploadView.jsx'
import TranscriptsView from './views/TranscriptsView.jsx'
import EditorView from './views/EditorView.jsx'
import UsersView from './views/UsersView.jsx'
import RolesView from './views/RolesView.jsx'
import AuditView from './views/AuditView.jsx'
import SettingsView from './views/SettingsView.jsx'
import { detectBackend, listJobs, logEvent } from './api.js'

const NAV = [
  {
    section: 'Workspace',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { id: 'upload', label: 'Upload Audio', icon: 'upload' },
      { id: 'transcripts', label: 'Transcripts', icon: 'file' },
    ],
  },
  {
    section: 'Administration',
    adminOnly: true,
    items: [
      { id: 'users', label: 'User Accounts', icon: 'users' },
      { id: 'roles', label: 'Roles & Permissions', icon: 'shield' },
      { id: 'audit', label: 'Audit Log', icon: 'list' },
      { id: 'settings', label: 'Settings', icon: 'sliders' },
    ],
  },
]

export default function App() {
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [jobs, setJobs] = useState([])
  const [openJobId, setOpenJobId] = useState(null)
  const [apiMode, setApiMode] = useState(null) // null | 'demo' | 'live'

  async function refreshJobs() {
    setJobs(await listJobs())
  }

  useEffect(() => {
    detectBackend().then(({ mode }) => {
      setApiMode(mode)
      refreshJobs()
    })
  }, [])

  if (!user) {
    return (
      <LoginView
        onLogin={(u) => {
          logEvent(u.name, 'Login', 'Successful sign-in')
          setUser(u)
          setView('dashboard')
        }}
      />
    )
  }

  const isAdmin = user.role === 'Administrator'

  function openTranscript(jobId) {
    setOpenJobId(jobId)
    setView('editor')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-badge"><Icon name="mic" size={18} /></div>
          <div className="logo-name">
            VoiceScript
            <small>SINHALA SPEECH-TO-TEXT</small>
          </div>
        </div>

        {NAV.filter((g) => !g.adminOnly || isAdmin).map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.items.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${view === item.id || (item.id === 'transcripts' && view === 'editor') ? 'active' : ''}`}
                onClick={() => setView(item.id)}
              >
                <Icon name={item.icon} /> {item.label}
              </button>
            ))}
          </div>
        ))}

        <div style={{ padding: '10px 12px' }}>
          {apiMode === 'live' && <span className="badge green">● Live transcription</span>}
          {apiMode === 'demo' && <span className="badge grey">Demo mode — sample data</span>}
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div className="who">
            <b>{user.name}</b>
            <span>{user.role}</span>
          </div>
          <button className="icon-btn" title="Sign out" onClick={() => setUser(null)}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="content">
        {view === 'dashboard' && <DashboardView user={user} goto={setView} jobCount={jobs.length} />}
        {view === 'upload' && (
          <UploadView user={user} onUploaded={setJobs} goToJobs={() => setView('transcripts')} />
        )}
        {view === 'transcripts' && (
          <TranscriptsView jobs={jobs} onOpen={openTranscript} onRefresh={refreshJobs} />
        )}
        {view === 'editor' && openJobId && (
          <EditorView user={user} jobId={openJobId} onBack={() => setView('transcripts')} />
        )}
        {isAdmin && view === 'users' && <UsersView user={user} />}
        {isAdmin && view === 'roles' && <RolesView user={user} />}
        {isAdmin && view === 'audit' && <AuditView />}
        {isAdmin && view === 'settings' && <SettingsView user={user} />}
      </main>
    </div>
  )
}
