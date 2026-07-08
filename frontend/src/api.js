// ---------------------------------------------------------------
// API layer with two modes:
//  - LIVE: talks to the backend (/api/*) — real ElevenLabs transcription
//  - DEMO: in-browser sample data, used when no backend is reachable
// detectBackend() picks the mode once at startup.
// Users, roles, audit and settings are still demo-only (next build step).
// ---------------------------------------------------------------

const API = import.meta.env.VITE_API_URL || '/api'
let live = false

export async function detectBackend() {
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 2500)
    const res = await fetch(`${API}/health`, { signal: ctrl.signal })
    clearTimeout(t)
    const data = await res.json()
    live = Boolean(data.ok)
    return { mode: live ? 'live' : 'demo', sttConfigured: Boolean(data.sttConfigured) }
  } catch {
    live = false
    return { mode: 'demo', sttConfigured: false }
  }
}

// ================= DEMO DATA =================

const RAW_SEGMENTS = [
  { id: 1, start: 0.0, end: 4.2, speaker: 'Speaker 1', lang: 'SI', conf: 0.97, text: 'සුභ උදෑසනක්. අද රැස්වීම ආරම්භ කරමු.' },
  { id: 2, start: 4.2, end: 9.8, speaker: 'Speaker 2', lang: 'MIX', conf: 0.91, text: 'Good morning sir. පළමු කාරණය ගැන report එක ready ද?' },
  { id: 3, start: 9.8, end: 16.5, speaker: 'Speaker 1', lang: 'MIX', conf: 0.88, text: 'ඔව්, draft එක ඊයේ evening එකේ complete කළා. Final version එක අද submit කරන්නම්.' },
  { id: 4, start: 16.5, end: 22.0, speaker: 'Speaker 3', lang: 'MIX', conf: 0.78, text: 'මට එක question එකක් තියෙනවා. Budget approval එක ලැබුණද?' },
  { id: 5, start: 22.0, end: 28.4, speaker: 'Speaker 2', lang: 'MIX', conf: 0.93, text: 'Yes, approval came through last Friday. ඒක minutes වල record කරලා තියෙනවා.' },
  { id: 6, start: 28.4, end: 34.0, speaker: 'Speaker 1', lang: 'MIX', conf: 0.95, text: 'හොඳයි. එහෙනම් next item එකට යමු. Please refer page five of the agenda.' },
]

const NORMALIZED_TEXT = {
  1: 'සුභ උදෑසනක්. අද රැස්වීම ආරම්භ කරමු.',
  2: 'සුභ උදෑසනක් මහත්මයා. පළමු කාරණය ගැන වාර්තාව සූදානම්ද?',
  3: 'ඔව්, කෙටුම්පත ඊයේ සවස සම්පූර්ණ කළා. අවසාන පිටපත අද භාර දෙන්නම්.',
  4: 'මට එක ප්‍රශ්නයක් තියෙනවා. අයවැය අනුමැතිය ලැබුණාද?',
  5: 'ඔව්, පසුගිය සිකුරාදා අනුමැතිය ලැබුණා. ඒක වාර්තාවල සටහන් කරලා තියෙනවා.',
  6: 'හොඳයි. එහෙනම් ඊළඟ කාරණයට යමු. කරුණාකර න්‍යාය පත්‍රයේ පස්වන පිටුව බලන්න.',
}

export function normalizedOf(seg) {
  return NORMALIZED_TEXT[seg.id] || seg.text
}

const cloneSegs = () => RAW_SEGMENTS.map((s) => ({ ...s }))

let demoJobs = [
  { id: 'job-1', fileName: 'commission_hearing_2026-07-06.mp3', duration: 34, status: 'completed', createdAt: '2026-07-06 10:15', language: 'Sinhala + English', classification: 'Confidential', audioUrl: null, segments: cloneSegs() },
  { id: 'job-2', fileName: 'witness_statement_045.wav', duration: 1260, status: 'completed', createdAt: '2026-07-05 14:42', language: 'Sinhala', classification: 'Restricted', audioUrl: null, segments: cloneSegs() },
  { id: 'job-3', fileName: 'press_briefing_july.mp4', duration: 2705, status: 'completed', createdAt: '2026-07-03 09:05', language: 'Sinhala + English', classification: 'Public', audioUrl: null, segments: cloneSegs() },
]
let nextDemoId = 4

const LANG_NAMES = { si: 'Sinhala', en: 'English', ta: 'Tamil' }

function fromBackend(job) {
  return {
    ...job,
    language: LANG_NAMES[job.language] || job.language || 'Sinhala + English',
    audioUrl: `${API}/transcriptions/${job.id}/audio`,
  }
}

// ================= Jobs (live-aware) =================

export async function listJobs() {
  if (!live) return [...demoJobs]
  const res = await fetch(`${API}/transcriptions`)
  return (await res.json()).map(fromBackend)
}

export async function getJobById(id) {
  if (!live) return demoJobs.find((j) => j.id === id) || null
  const res = await fetch(`${API}/transcriptions/${id}`)
  if (!res.ok) return null
  return fromBackend(await res.json())
}

export async function uploadAudio(file, classification, user, onUpdate) {
  logEvent(user, 'Upload', `${file.name} (${classification})`)

  if (live) {
    const form = new FormData()
    form.append('file', file)
    form.append('classification', classification)
    const res = await fetch(`${API}/transcriptions`, { method: 'POST', body: form })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `Upload failed (${res.status})`)
    }
    onUpdate(await listJobs())
    return
  }

  // Demo mode: fake a 3-second transcription.
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const job = {
    id: `job-${nextDemoId++}`,
    fileName: file.name,
    duration: null,
    status: 'processing',
    createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    language: 'Sinhala + English',
    classification,
    audioUrl: URL.createObjectURL(file),
    segments: [],
  }
  demoJobs = [job, ...demoJobs]
  onUpdate(await listJobs())
  setTimeout(async () => {
    job.status = 'completed'
    job.segments = cloneSegs()
    job.duration = 34
    onUpdate(await listJobs())
  }, 3000)
}

export async function saveSegments(jobId, segments, user) {
  if (live) {
    await fetch(`${API}/transcriptions/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ segments }),
    })
  } else {
    const job = demoJobs.find((j) => j.id === jobId)
    if (job) job.segments = segments
  }
  logEvent(user, 'Edit', `Saved transcript changes (${jobId})`)
}

export async function setClassification(jobId, tier, user) {
  if (live) {
    await fetch(`${API}/transcriptions/${jobId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classification: tier }),
    })
  } else {
    const job = demoJobs.find((j) => j.id === jobId)
    if (job) job.classification = tier
  }
  logEvent(user, 'Admin', `Reclassified ${jobId} as ${tier}`)
}

// ================= Users / roles / audit / settings (demo-only for now) =================

let users = [
  { id: 1, name: 'A. Perera', email: 'a.perera@commission.gov.lk', role: 'Administrator', active: true, lastLogin: '2026-07-08 08:02' },
  { id: 2, name: 'S. Fernando', email: 's.fernando@commission.gov.lk', role: 'Transcription Clerk', active: true, lastLogin: '2026-07-08 07:45' },
  { id: 3, name: 'N. Jayawardena', email: 'n.jaya@commission.gov.lk', role: 'Legal Researcher', active: true, lastLogin: '2026-07-07 16:20' },
  { id: 4, name: 'K. Silva', email: 'k.silva@commission.gov.lk', role: 'Auditor', active: true, lastLogin: '2026-07-06 11:08' },
  { id: 5, name: 'R. Bandara', email: 'r.bandara@commission.gov.lk', role: 'Transcription Clerk', active: false, lastLogin: '2026-06-12 09:30' },
]
let nextUserId = 6

export const PERMISSIONS = [
  'Upload audio',
  'View transcripts',
  'Edit transcripts',
  'Export documents',
  'Manage classifications',
  'Manage users & roles',
  'View audit logs',
]

let roles = [
  { id: 1, name: 'Administrator', builtIn: true, perms: [...PERMISSIONS] },
  { id: 2, name: 'Transcription Clerk', builtIn: true, perms: ['Upload audio', 'View transcripts', 'Edit transcripts', 'Export documents'] },
  { id: 3, name: 'Legal Researcher', builtIn: true, perms: ['View transcripts', 'Export documents'] },
  { id: 4, name: 'Auditor', builtIn: true, perms: ['View transcripts', 'View audit logs'] },
]
let nextRoleId = 5

let audit = [
  { id: 1, time: '2026-07-08 08:02', user: 'A. Perera', action: 'Login', detail: 'Successful sign-in', ip: '10.20.1.14' },
  { id: 2, time: '2026-07-07 16:31', user: 'N. Jayawardena', action: 'Export', detail: 'witness_statement_045.wav → DOCX', ip: '10.20.1.22' },
  { id: 3, time: '2026-07-07 16:20', user: 'N. Jayawardena', action: 'View', detail: 'Opened witness_statement_045.wav', ip: '10.20.1.22' },
  { id: 4, time: '2026-07-06 10:49', user: 'S. Fernando', action: 'Edit', detail: 'Corrected 12 segments in commission_hearing_2026-07-06.mp3', ip: '10.20.1.31' },
  { id: 5, time: '2026-07-06 10:16', user: 'S. Fernando', action: 'Upload', detail: 'commission_hearing_2026-07-06.mp3 (Confidential)', ip: '10.20.1.31' },
  { id: 6, time: '2026-06-30 09:12', user: 'A. Perera', action: 'Admin', detail: 'Deactivated account r.bandara@commission.gov.lk', ip: '10.20.1.14' },
]
let nextAuditId = 7

export function logEvent(userName, action, detail) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  audit = [{
    id: nextAuditId++,
    time: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    user: userName, action, detail,
    ip: '10.20.1.14',
  }, ...audit]
}

let settings = {
  minPasswordLength: 12,
  requireComplexity: true,
  sessionTimeoutMins: 30,
  maxConcurrentSessions: 1,
  storageMode: 'On-premises',
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

export const getStats = (jobCount) => ({
  transcripts: (jobCount ?? 3) + 125,
  audioHours: 342,
  avgConfidence: '93.4%',
  activeUsers: users.filter((u) => u.active).length + 13,
})
