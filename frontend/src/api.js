// ---------------------------------------------------------------
// MOCK API — temporary stand-in for the real backend.
// All demo data lives here. When the backend is ready these
// functions become fetch() calls; the screens will not change.
// ---------------------------------------------------------------

// ---- Transcript sample (raw = exactly as spoken, mixed language) ----
const RAW_SEGMENTS = [
  { id: 1, start: 0.0, end: 4.2, speaker: 'Speaker 1', lang: 'SI', conf: 0.97, text: 'සුභ උදෑසනක්. අද රැස්වීම ආරම්භ කරමු.' },
  { id: 2, start: 4.2, end: 9.8, speaker: 'Speaker 2', lang: 'MIX', conf: 0.91, text: 'Good morning sir. පළමු කාරණය ගැන report එක ready ද?' },
  { id: 3, start: 9.8, end: 16.5, speaker: 'Speaker 1', lang: 'MIX', conf: 0.88, text: 'ඔව්, draft එක ඊයේ evening එකේ complete කළා. Final version එක අද submit කරන්නම්.' },
  { id: 4, start: 16.5, end: 22.0, speaker: 'Speaker 3', lang: 'MIX', conf: 0.78, text: 'මට එක question එකක් තියෙනවා. Budget approval එක ලැබුණද?' },
  { id: 5, start: 22.0, end: 28.4, speaker: 'Speaker 2', lang: 'MIX', conf: 0.93, text: 'Yes, approval came through last Friday. ඒක minutes වල record කරලා තියෙනවා.' },
  { id: 6, start: 28.4, end: 34.0, speaker: 'Speaker 1', lang: 'MIX', conf: 0.95, text: 'හොඳයි. එහෙනම් next item එකට යමු. Please refer page five of the agenda.' },
]

// Normalized variant: same speech rendered fully in Sinhala (derived output).
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

// ---- Jobs ----
let jobs = [
  { id: 'job-1', fileName: 'commission_hearing_2026-07-06.mp3', duration: 34, status: 'completed', createdAt: '2026-07-06 10:15', language: 'Sinhala + English', classification: 'Confidential', audioUrl: null, segments: cloneSegs() },
  { id: 'job-2', fileName: 'witness_statement_045.wav', duration: 1260, status: 'completed', createdAt: '2026-07-05 14:42', language: 'Sinhala', classification: 'Restricted', audioUrl: null, segments: cloneSegs() },
  { id: 'job-3', fileName: 'press_briefing_july.mp4', duration: 2705, status: 'completed', createdAt: '2026-07-03 09:05', language: 'Sinhala + English', classification: 'Public', audioUrl: null, segments: cloneSegs() },
]
let nextId = 4

// ---- Users ----
let users = [
  { id: 1, name: 'A. Perera', email: 'a.perera@commission.gov.lk', role: 'Administrator', active: true, lastLogin: '2026-07-08 08:02' },
  { id: 2, name: 'S. Fernando', email: 's.fernando@commission.gov.lk', role: 'Transcription Clerk', active: true, lastLogin: '2026-07-08 07:45' },
  { id: 3, name: 'N. Jayawardena', email: 'n.jaya@commission.gov.lk', role: 'Legal Researcher', active: true, lastLogin: '2026-07-07 16:20' },
  { id: 4, name: 'K. Silva', email: 'k.silva@commission.gov.lk', role: 'Auditor', active: true, lastLogin: '2026-07-06 11:08' },
  { id: 5, name: 'R. Bandara', email: 'r.bandara@commission.gov.lk', role: 'Transcription Clerk', active: false, lastLogin: '2026-06-12 09:30' },
]
let nextUserId = 6

// ---- Roles & permissions ----
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

// ---- Audit log (append-only) ----
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

// ---- Settings ----
let settings = {
  minPasswordLength: 12,
  requireComplexity: true,
  sessionTimeoutMins: 30,
  maxConcurrentSessions: 1,
  storageMode: 'On-premises',
}

// ================= API surface =================
export const listJobs = () => [...jobs]
export const getJob = (id) => jobs.find((j) => j.id === id) || null

export function uploadAudio(file, classification, user, onUpdate) {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const job = {
    id: `job-${nextId++}`,
    fileName: file.name,
    duration: null,
    status: 'processing',
    createdAt: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`,
    language: 'Sinhala + English',
    classification,
    audioUrl: URL.createObjectURL(file),
    segments: [],
  }
  jobs = [job, ...jobs]
  logEvent(user, 'Upload', `${file.name} (${classification})`)
  onUpdate(listJobs())

  setTimeout(() => {
    job.status = 'completed'
    job.segments = cloneSegs()
    job.duration = 34
    onUpdate(listJobs())
  }, 3000)
  return job
}

export function saveSegments(jobId, segments, user) {
  const job = getJob(jobId)
  if (!job) return
  job.segments = segments
  logEvent(user, 'Edit', `Saved changes to ${job.fileName}`)
}

export function setClassification(jobId, tier, user) {
  const job = getJob(jobId)
  if (!job) return
  job.classification = tier
  logEvent(user, 'Admin', `Reclassified ${job.fileName} as ${tier}`)
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

export const getStats = () => ({
  transcripts: jobs.length + 125,
  audioHours: 342,
  avgConfidence: '93.4%',
  activeUsers: users.filter((u) => u.active).length + 13,
})
