const crypto = require('node:crypto')
const { put } = require('@vercel/blob')
const { requireAuth } = require('../_auth.js')
const { audit } = require('../_db.js')
const { transcribeSmart } = require('../_stt.js')

const ALLOWED_EXT = ['.mp3', '.wav', '.mp4', '.m4a', '.webm']
const MAX_AUDIO_BYTES = 3.2 * 1024 * 1024

const rowToJob = (r) => ({
  id: r.id,
  fileName: r.file_name,
  owner: r.owner_name || null,
  classification: r.classification,
  language: r.language,
  duration: r.duration,
  status: r.status,
  error: r.error,
  segments: r.segments,
  createdAt: r.created_at_fmt,
})

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const ctx = await requireAuth(req, res, 'View transcripts')
    if (!ctx) return
    const rows = await ctx.sql`
      SELECT t.*, u.name AS owner_name, to_char(t.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_fmt
      FROM transcripts t LEFT JOIN users u ON u.id = t.owner_id
      ORDER BY t.created_at DESC LIMIT 500`
    return res.json(rows.map(rowToJob))
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ctx = await requireAuth(req, res, 'Upload audio')
  if (!ctx) return
  const { sql, user } = ctx

  const { fileName, data, classification } = req.body || {}
  if (!fileName || !data) return res.status(400).json({ error: 'Expected fileName and base64 data.' })
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  if (!ALLOWED_EXT.includes(ext)) {
    return res.status(400).json({ error: `Unsupported format "${ext}". Allowed: MP3, WAV, MP4, M4A.` })
  }
  let buffer
  try {
    buffer = Buffer.from(data, 'base64')
  } catch {
    return res.status(400).json({ error: 'Invalid base64 audio data.' })
  }
  if (buffer.length > MAX_AUDIO_BYTES) {
    return res.status(413).json({ error: 'File too large for this deployment (max ~3 MB). Use a shorter clip.' })
  }

  const id = `job-${crypto.randomUUID().slice(0, 8)}`
  const tier = ['Public', 'Restricted', 'Confidential'].includes(classification) ? classification : 'Restricted'
  await audit(sql, user, 'Upload', `${fileName} (${tier})`, req)

  // Store the original audio permanently (playback from any device).
  let audioUrl = null
  try {
    const blob = await put(`audio/${id}${ext}`, buffer, { access: 'public', addRandomSuffix: true })
    audioUrl = blob.url
  } catch (e) {
    console.error('Blob upload failed:', e.message)
  }

  try {
    const result = await transcribeSmart(buffer, fileName)
    const rows = await sql`
      INSERT INTO transcripts (id, file_name, owner_id, classification, language, duration, status, segments, audio_url, audio_ext)
      VALUES (${id}, ${fileName}, ${user.id}, ${tier}, ${result.languageLabel || result.languageCode},
              ${result.durationSec}, 'completed', ${JSON.stringify(result.segments)}, ${audioUrl}, ${ext})
      RETURNING *, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at_fmt`
    return res.json(rowToJob({ ...rows[0], owner_name: user.name }))
  } catch (e) {
    const rows = await sql`
      INSERT INTO transcripts (id, file_name, owner_id, classification, status, error, audio_url, audio_ext)
      VALUES (${id}, ${fileName}, ${user.id}, ${tier}, 'failed', ${e.message}, ${audioUrl}, ${ext})
      RETURNING *, to_char(created_at, 'YYYY-MM-DD HH24:MI') AS created_at_fmt`
    return res.status(502).json(rowToJob({ ...rows[0], owner_name: user.name }))
  }
}
