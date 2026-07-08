const { transcribeSmart } = require('./_stt.js')

const ALLOWED_EXT = ['.mp3', '.wav', '.mp4', '.m4a']
// Vercel request bodies are capped at ~4.5 MB; base64 adds ~33% overhead.
const MAX_AUDIO_BYTES = 3.2 * 1024 * 1024

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { fileName, data } = req.body || {}
  if (!fileName || !data) return res.status(400).json({ error: 'Expected JSON body with fileName and base64 data.' })

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
    return res.status(413).json({ error: 'File too large for the online demo (max ~3 MB). Use a shorter clip.' })
  }

  try {
    const result = await transcribeSmart(buffer, fileName)
    return res.json(result)
  } catch (e) {
    console.error('Transcription failed:', e.message)
    return res.status(502).json({ error: e.message })
  }
}
