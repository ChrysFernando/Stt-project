const { requireAuth } = require('../_auth.js')

// Audio is fetched through this authenticated endpoint; the underlying
// blob URL is never shown to the browser.
module.exports = async (req, res) => {
  const ctx = await requireAuth(req, res, 'View transcripts')
  if (!ctx) return
  const rows = await ctx.sql`SELECT audio_url, audio_ext FROM transcripts WHERE id = ${req.query.id}`
  if (!rows[0] || !rows[0].audio_url) return res.status(404).json({ error: 'Audio not found' })

  const upstream = await fetch(rows[0].audio_url)
  if (!upstream.ok) return res.status(502).json({ error: 'Audio store unavailable' })
  const buf = Buffer.from(await upstream.arrayBuffer())
  const MIME = { '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.mp4': 'video/mp4', '.m4a': 'audio/mp4', '.webm': 'audio/webm' }
  res.setHeader('Content-Type', MIME[rows[0].audio_ext] || 'application/octet-stream')
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.send(buf)
}
