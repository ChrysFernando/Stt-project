import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { transcribeFile, isConfigured } from './elevenlabs.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads')
const DB_FILE = path.join(DATA_DIR, 'jobs.json')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

// Formats required by the specification (2.1); size limit per our stated capacity (2.4).
const ALLOWED_EXT = ['.mp3', '.wav', '.mp4', '.m4a']
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024 // 2 GB

let jobs = fs.existsSync(DB_FILE) ? JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) : []
const persist = () => fs.writeFileSync(DB_FILE, JSON.stringify(jobs, null, 2))

const now = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

const extOf = (name) => name.slice(name.lastIndexOf('.')).toLowerCase()

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${extOf(file.originalname)}`),
})
const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_EXT.includes(extOf(file.originalname))) return cb(null, true)
    cb(new Error(`Unsupported format "${extOf(file.originalname)}". Allowed: MP3, WAV, MP4, M4A.`))
  },
})

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'voicescript-backend', sttConfigured: isConfigured() })
})

app.get('/api/transcriptions', (req, res) => {
  res.json(jobs.map(({ filePath, ...rest }) => rest))
})

app.get('/api/transcriptions/:id', (req, res) => {
  const job = jobs.find((j) => j.id === req.params.id)
  if (!job) return res.status(404).json({ error: 'Not found' })
  const { filePath, ...rest } = job
  res.json(rest)
})

app.get('/api/transcriptions/:id/audio', (req, res) => {
  const job = jobs.find((j) => j.id === req.params.id)
  if (!job || !fs.existsSync(job.filePath)) return res.status(404).json({ error: 'Not found' })
  res.sendFile(job.filePath)
})

app.post('/api/transcriptions', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file provided.' })

    const job = {
      id: `job-${crypto.randomUUID().slice(0, 8)}`,
      fileName: req.file.originalname,
      filePath: req.file.path,
      classification: req.body.classification || 'Restricted',
      status: 'processing',
      createdAt: now(),
      language: null,
      duration: null,
      segments: [],
      error: null,
    }
    jobs.unshift(job)
    persist()

    const { filePath, ...publicJob } = job
    res.status(201).json(publicJob)

    // Transcribe in the background; clients poll GET /api/transcriptions.
    transcribeFile(job.filePath, job.fileName)
      .then((result) => {
        job.status = 'completed'
        job.segments = result.segments
        job.duration = result.durationSec
        job.language = result.languageCode
      })
      .catch((e) => {
        job.status = 'failed'
        job.error = e.message
        console.error(`Transcription failed for ${job.fileName}:`, e.message)
      })
      .finally(persist)
  })
})

app.put('/api/transcriptions/:id', (req, res) => {
  const job = jobs.find((j) => j.id === req.params.id)
  if (!job) return res.status(404).json({ error: 'Not found' })
  if (Array.isArray(req.body.segments)) job.segments = req.body.segments
  if (req.body.classification) job.classification = req.body.classification
  persist()
  const { filePath, ...rest } = job
  res.json(rest)
})

app.delete('/api/transcriptions/:id', (req, res) => {
  const idx = jobs.findIndex((j) => j.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'Not found' })
  const [job] = jobs.splice(idx, 1)
  if (job.filePath && fs.existsSync(job.filePath)) fs.unlinkSync(job.filePath)
  persist()
  res.json({ ok: true })
})

const PORT = process.env.PORT || 8000
app.listen(PORT, () => {
  console.log(`VoiceScript backend on http://localhost:${PORT}`)
  console.log(`ElevenLabs STT configured: ${isConfigured() ? 'yes' : 'NO — set ELEVENLABS_API_KEY in backend/.env'}`)
})
