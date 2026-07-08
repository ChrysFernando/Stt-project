import { useEffect, useState } from 'react'
import Icon from './icons.jsx'
import LoginView from './views/LoginView.jsx'
import DashboardView from './views/DashboardView.jsx'
import UploadView from './views/UploadView.jsx'
import RecordView from './views/RecordView.jsx'
import TranscriptsView from './views/TranscriptsView.jsx'
import EditorView from './views/EditorView.jsx'
import UsersView from './views/UsersView.jsx'
import RolesView from './views/RolesView.jsx'
import AuditView from './views/AuditView.jsx'
import SettingsView from './views/SettingsView.jsx'
import { detectBackend, me, logout, listJobs } from './api.js'

export default function App() {
  const [booting, setBooting] = useState(true)
  const [backend, setBackend] = useState({ mode: 'offline' })
  const [user, setUser] = useState(null)
  const [view, setView] = useState('dashboard')
  const [jobs, setJobs] = useState([])
  const [openJobId, setOpenJobId] = useState(null)

  async function refreshJobs() {
    setJobs(await listJobs())
  }

  useEffect(() => {
    ;(async () => {
      const b = await detectBackend()
      setBackend(b)
      if (b.mode === 'server') {
        const u = await me()
        if (u) setUser(u)
      }
      setBooting(false)
    })()
  }, [])

  useEffect(() => {
    if (user) refreshJobs()
  }, [user])

  if (booting) {
    return <div className="login-wrap"><p className="muted">Loading…</p></div>
  }

  if (backend.mode !== 'server') {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="logo">
            <div className="logo-badge"><Icon name="mic" size={18} /></div>
            <div className="logo-name">VoiceScript<small>SINHALA SPEECH-TO-TEXT</small></div>
          </div>
          {backend.mode === 'setup' ? (
            <>
              <h1 className="login-title">One-time setup needed</h1>
              <p className="login-sub" style={{ marginBottom: 0 }}>
                The database is not connected yet. In Vercel, open this project's
                <b> Storage</b> tab and create a <b>Neon (Postgres)</b> database and a
                <b> Blob</b> store, connect both to the project, then redeploy.
              </p>
            </>
          ) : (
            <>
              <h1 className="login-title">Server unreachable</h1>
              <p className="login-sub" style={{ marginBottom: 0 }}>
                The VoiceScript server is not responding. Please try again shortly.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  if (!user) {
    return <LoginView onLogin={(u) => { setUser(u); setView('dashboard') }} />
  }

  const can = (p) => user.perms.includes(p)
  const NAV = [
    {
      section: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', show: true },
        { id: 'upload', label: 'Upload Audio', icon: 'upload', show: can('Upload audio') },
        { id: 'record', label: 'Record & Dictate', icon: 'mic', show: can('Upload audio') },
        { id: 'transcripts', label: 'Transcripts', icon: 'file', show: can('View transcripts') },
      ],
    },
    {
      section: 'Administration',
      items: [
        { id: 'users', label: 'User Accounts', icon: 'users', show: can('Manage users & roles') },
        { id: 'roles', label: 'Roles & Permissions', icon: 'shield', show: can('Manage users & roles') },
        { id: 'audit', label: 'Audit Log', icon: 'list', show: can('View audit logs') },
        { id: 'settings', label: 'Settings', icon: 'sliders', show: can('Manage users & roles') },
      ],
    },
  ]

  function openTranscript(jobId) {
    setOpenJobId(jobId)
    setView('editor')
  }

  async function signOut() {
    await logout()
    setUser(null)
    setJobs([])
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

        {NAV.map((group) => {
          const items = group.items.filter((i) => i.show)
          if (!items.length) return null
          return (
            <div key={group.section}>
              <div className="nav-section">{group.section}</div>
              {items.map((item) => (
                <button
                  key={item.id}
                  className={`nav-item ${view === item.id || (item.id === 'transcripts' && view === 'editor') ? 'active' : ''}`}
                  onClick={() => setView(item.id)}
                >
                  <Icon name={item.icon} /> {item.label}
                </button>
              ))}
            </div>
          )
        })}

        <div style={{ padding: '10px 12px' }}>
          <span className="badge green">● Live · server-backed</span>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{user.name.slice(0, 1)}</div>
          <div className="who">
            <b>{user.name}</b>
            <span>{user.role}</span>
          </div>
          <button className="icon-btn" title="Sign out" onClick={signOut}>
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="content">
        {view === 'dashboard' && <DashboardView user={user} goto={setView} jobs={jobs} />}
        {view === 'upload' && can('Upload audio') && (
          <UploadView onUploaded={setJobs} goToJobs={() => setView('transcripts')} />
        )}
        {view === 'record' && can('Upload audio') && (
          <RecordView onUploaded={setJobs} goToJobs={() => setView('transcripts')} />
        )}
        {view === 'transcripts' && can('View transcripts') && (
          <TranscriptsView jobs={jobs} onOpen={openTranscript} onRefresh={refreshJobs} />
        )}
        {view === 'editor' && openJobId && (
          <EditorView user={user} jobId={openJobId} onBack={() => setView('transcripts')} />
        )}
        {view === 'users' && can('Manage users & roles') && <UsersView />}
        {view === 'roles' && can('Manage users & roles') && <RolesView />}
        {view === 'audit' && can('View audit logs') && <AuditView />}
        {view === 'settings' && can('Manage users & roles') && <SettingsView />}
      </main>
    </div>
  )
}
