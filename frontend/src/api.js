// ---------------------------------------------------------------
// API layer — everything is server-backed now: sessions, RBAC,
// transcripts, users, roles, settings and the append-only audit log
// live in PostgreSQL; audio lives in blob storage.
// ---------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || '/api'

async function call(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`)
    err.status = res.status
    throw err
  }
  return data
}

export async function detectBackend() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 3000)
    const res = await fetch(`${API}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    const h = await res.json()
    if (!h.ok) return { mode: 'offline' }
    if (!h.db) return { mode: 'setup', blob: h.blob, sttConfigured: h.sttConfigured }
    return { mode: 'server', blob: h.blob, sttConfigured: h.sttConfigured }
  } catch {
    return { mode: 'offline' }
  }
}

// ================= Auth =================

export async function login(email, password) {
  const data = await call('/auth/login', { method: 'POST', body: { email, password } })
  return data.user
}

export async function logout() {
  try { await call('/auth/logout', { method: 'POST' }) } catch { /* session already gone */ }
}

export async function me() {
  try {
    const data = await call('/auth/me')
    return data.user
  } catch {
    return null
  }
}

// ================= Transcripts =================

export const CLOUD_MAX_BYTES = 3.2 * 1024 * 1024

const fileToBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader()
  r.onload = () => resolve(String(r.result).split(',')[1])
  r.onerror = reject
  r.readAsDataURL(file)
})

// Uploads still being transcribed (the POST is synchronous server-side).
let pending = []

export async function listJobs() {
  const server = await call('/transcriptions').catch(() => [])
  return [...pending, ...server]
}

export async function getJobById(id) {
  const p = pending.find((j) => j.id === id)
  if (p) return p
  try {
    return await call(`/transcriptions/item?id=${encodeURIComponent(id)}`)
  } catch {
    return null
  }
}

export async function uploadAudio(file, classification, onUpdate) {
  if (file.size > CLOUD_MAX_BYTES) {
    throw new Error('This deployment accepts files up to ~3 MB (about 3–5 minutes of MP3). Larger files unlock with the storage upgrade.')
  }
  const temp = {
    id: `pending-${Date.now()}`,
    fileName: file.name,
    status: 'processing',
    classification,
    createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    language: null,
    duration: null,
    segments: [],
  }
  pending.unshift(temp)
  onUpdate(await listJobs())

  ;(async () => {
    try {
      const data = await fileToBase64(file)
      await call('/transcriptions', {
        method: 'POST',
        body: { fileName: file.name, data, classification },
      })
    } catch (e) {
      temp.status = 'failed'
      temp.error = e.message
      // leave the failed marker visible briefly, then let the server list take over
      setTimeout(async () => {
        pending = pending.filter((j) => j.id !== temp.id)
        onUpdate(await listJobs())
      }, 8000)
      onUpdate(await listJobs())
      return
    }
    pending = pending.filter((j) => j.id !== temp.id)
    onUpdate(await listJobs())
  })()
}

export async function saveSegments(jobId, segments) {
  await call(`/transcriptions/item?id=${encodeURIComponent(jobId)}`, { method: 'PUT', body: { segments } })
}

export async function setClassification(jobId, tier) {
  await call(`/transcriptions/item?id=${encodeURIComponent(jobId)}`, { method: 'PUT', body: { classification: tier } })
}

// Exports happen in the browser; report them so the audit log is complete.
export function reportExport(detail) {
  call('/audit', { method: 'POST', body: { action: 'Export', detail } }).catch(() => {})
}

// ================= Admin =================

export const PERMISSIONS = [
  'Upload audio',
  'View transcripts',
  'Edit transcripts',
  'Export documents',
  'Manage classifications',
  'Manage users & roles',
  'View audit logs',
]

export const listUsers = () => call('/users')
export const createUser = (user) => call('/users', { method: 'POST', body: user })
export const userAction = (id, action, extra = {}) => call('/users', { method: 'PATCH', body: { id, action, ...extra } })

export const listRoles = () => call('/roles')
export const createRole = (name) => call('/roles', { method: 'POST', body: { name } })
export const toggleRolePerm = (id, perm) => call('/roles', { method: 'PATCH', body: { id, perm } })

export const listAudit = () => call('/audit')
export const myActivity = () => call('/audit?mine=1')

export const getSettings = () => call('/settings')
export const saveSettings = (s) => call('/settings', { method: 'PUT', body: s })
