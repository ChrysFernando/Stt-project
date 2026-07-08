// ---------------------------------------------------------------
// API layer. Two live modes, no mock data:
//  - LIVE:  full backend (Express) — jobs stored on the server
//  - CLOUD: stateless serverless backend (Vercel) — transcription on the
//           server, transcript library kept in this browser (localStorage)
// If no backend is reachable, the app says so instead of faking data.
// Users/roles/audit/settings are client-side previews until the
// security build (spec sections 5–6) moves them to the server.
// ---------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || '/api'
let live = false
let cloud = false

export async function detectBackend() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${API}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    const data = await res.json()
    live = Boolean(data.ok)
    cloud = Boolean(data.stateless)
    return { mode: live ? 'live' : 'offline', sttConfigured: Boolean(data.sttConfigured) }
  } catch {
    live = false
    cloud = false
    return { mode: 'offline', sttConfigured: false }
  }
}

// ---- Cloud-mode job store (browser localStorage; audio URLs live per session) ----
const LS_KEY = 'voicescript-jobs'
const sessionAudioUrls = {}
const loadCloudJobs = () => {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') } catch { return [] }
}
const saveCloudJobs = (jobsArr) => localStorage.setItem(LS_KEY, JSON.stringify(jobsArr))
const withAudio = (j) => ({ ...j, audioUrl: sessionAudioUrls[j.id] || null })

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(file)
})

export const CLOUD_MAX_BYTES = 3.2 * 1024 * 1024

const LANG_NAMES = { si: 'Sinhala', sin: 'Sinhala', en: 'English', eng: 'English', ta: 'Tamil', tam: 'Tamil' }

function fromBackend(job) {
  return {
    ...job,
    language: LANG_NAMES[job.language] || job.language || null,
    audioUrl: `${API}/transcriptions/${job.id}/audio`,
  }
}

// ================= Jobs =================

export async function listJobs() {
  if (cloud) return loadCloudJobs().map(withAudio)
  if (!live) return []
  const res = await fetch(`${API}/transcriptions`)
  return (await res.json()).map(fromBackend)
}

export async function getJobById(id) {
  if (cloud) {
    const job = loadCloudJobs().find((j) => j.id === id)
    return job ? withAudio(job) : null
  }
  if (!live) return null
  const res = await fetch(`${API}/transcriptions/${id}`)
  if (!res.ok) return null
  return fromBackend(await res.json())
}

export async function uploadAudio(file, classification, user, onUpdate) {
  if (!live) {
    throw new Error('The transcription server is not reachable right now. Please try again in a moment.')
  }
  logEvent(user, 'Upload', `${file.name} (${classification})`)

  if (cloud) {
    if (file.size > CLOUD_MAX_BYTES) {
      throw new Error('This deployment accepts files up to ~3 MB (about 3–5 minutes of MP3). Larger files unlock with the storage upgrade.')
    }
    const now = new Date()
    const pad = (n) => String(n).padStart(2, '0')
    const job = {
      id: `job-${crypto.randomUUID().slice(0, 8)}`,
      fileName: file.name,
      duration: null,
      status: 'processing',
      createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
      language: null,
      classification,
      segments: [],
      error: null,
    }
    const jobs = loadCloudJobs()
    jobs.unshift(job)
    saveCloudJobs(jobs)
    sessionAudioUrls[job.id] = URL.createObjectURL(file)
    onUpdate(await listJobs())

    // Transcribe in the background; the transcripts list polls for the result.
    ;(async () => {
      try {
        const data = await fileToBase64(file)
        const res = await fetch(`${API}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, data }),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(body.error || `Transcription failed (${res.status})`)
        job.status = 'completed'
        job.segments = body.segments
        job.duration = body.durationSec
        job.language = LANG_NAMES[body.languageCode] || body.languageCode || null
      } catch (e) {
        job.status = 'failed'
        job.error = e.message
      }
      const updated = loadCloudJobs().map((j) => (j.id === job.id ? job : j))
      saveCloudJobs(updated)
      onUpdate(await listJobs())
    })()
    return
  }

  const form = new FormData()
  form.append('file', file)
  form.append('classification', classification)
  const res = await fetch(`${API}/transcriptions`, { method: 'POST', body: form })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Upload failed (${res.status})`)
  }
  onUpdate(await listJobs())
}

export async function saveSegments(jobId, segments, user) {
  if (cloud) {
    saveCloudJobs(loadCloudJobs().map((j) => (j.id === jobId ? { ...j, segments } : j)))
  } else if (live) {
    await fetch(`${API}/transcriptions/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    })
  }
  logEvent(user, 'Edit', `Saved transcript changes (${jobId})`)
}

export async function setClassification(jobId, tier, user) {
  if (cloud) {
    saveCloudJobs(loadCloudJobs().map((j) => (j.id === jobId ? { ...j, classification: tier } : j)))
  } else if (live) {
    await fetch(`${API}/transcriptions/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classification: tier }),
    })
  }
  logEvent(user, 'Admin', `Reclassified ${jobId} as ${tier}`)
}

// ============ Users / roles / audit / settings ============
// PREVIEW ONLY: lives in this browser session. The security build
// (spec sections 5–6) replaces this with server-enforced data.

export const PERMISSIONS = [
  'Upload audio',
  'View transcripts',
  'Edit transcripts',
  'Export documents',
  'Manage classifications',
  'Manage users & roles',
  'View audit logs',
]

let users = [
  { id: 1, name: 'A. Perera', email: 'demo-admin (built-in)', role: 'Administrator', active: true, lastLogin: '—' },
  { id: 2, name: 'S. Fernando', email: 'demo-clerk (built-in)', role: 'Transcription Clerk', active: true, lastLogin: '—' },
]
let nextUserId = 3

let roles = [
  { id: 1, name: 'Administrator', builtIn: true, perms: [...PERMISSIONS] },
  { id: 2, name: 'Transcription Clerk', builtIn: true, perms: ['Upload audio', 'View transcripts', 'Edit transcripts', 'Export documents'] },
  { id: 3, name: 'Legal Researcher', builtIn: true, perms: ['View transcripts', 'Export documents'] },
  { id: 4, name: 'Auditor', builtIn: true, perms: ['View transcripts', 'View audit logs'] },
]
let nextRoleId = 5

// Audit trail: starts empty and records the real actions of this session.
let audit = []
let nextAuditId = 1

export function logEvent(userName, action, detail) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  audit = [{
    id: nextAuditId++,
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    user: userName, action, detail,
    ip: 'this device',
  }, ...audit]
}

let settings = {
  minPasswordLength: 12,
  requireComplexity: true,
  sessionTimeoutMins: 30,
  maxConcurrentSessions: 1,
  storageMode: 'Cloud',
}

export const listUsers = () => [...users]
export function addUser(name, email, role, actor) {
  users = [...users, { id: nextUserId++, name, email, role, active: true, lastLogin: '—' }]
  logEvent(actor, 'Admin', `Created account ${email} (${role})`)
}
export function toggleUser(id, actor) {
  users = users.map((u) => (u.id === id ? { ...u, active: !u.active } : u))
  const u = users.find((x) => x.id === id)
  logEvent(actor, 'Admin', `${u.active ? 'Reactivated' : 'Deactivated'} account ${u.email}`)
}

export const listRoles = () => roles.map((r) => ({ ...r, perms: [...r.perms] }))
export function togglePermission(roleId, perm, actor) {
  roles = roles.map((r) => {
    if (r.id !== roleId) return r
    const has = r.perms.includes(perm)
    logEvent(actor, 'Admin', `${has ? 'Revoked' : 'Granted'} "${perm}" ${has ? 'from' : 'to'} role ${r.name}`)
    return { ...r, perms: has ? r.perms.filter((p) => p !== perm) : [...r.perms, perm] }
  })
}
export function addRole(name, actor) {
  roles = [...roles, { id: nextRoleId++, name, builtIn: false, perms: ['View transcripts'] }]
  logEvent(actor, 'Admin', `Created custom role "${name}"`)
}

export const listAudit = () => [...audit]

export const getSettings = () => ({ ...settings })
export function saveSettings(next, actor) {
  settings = { ...settings, ...next }
  logEvent(actor, 'Admin', 'Updated security settings')
}
