const { del } = require('@vercel/blob')
const { requireAuth } = require('../_auth.js')
const { audit } = require('../_db.js')

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
  audioUrl: r.audio_url ? `/api/transcriptions/audio?id=${r.id}` : null,
})

module.exports = async (req, res) => {
  const id = req.query.id
  if (!id) return res.status(400).json({ error: 'Missing id.' })

  if (req.method === 'GET') {
    const ctx = await requireAuth(req, res, 'View transcripts')
    if (!ctx) return
    const rows = await ctx.sql`
      SELECT t.*, u.name AS owner_name, to_char(t.created_at, 'YYYY-MM-DD HH24:MI') AS created_at_fmt
      FROM transcripts t LEFT JOIN users u ON u.id = t.owner_id WHERE t.id = ${id}`
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    await audit(ctx.sql, ctx.user, 'View', `Opened ${rows[0].file_name}`, req)
    return res.json(rowToJob(rows[0]))
  }

  if (req.method === 'PUT') {
    const wantsClassification = req.body && req.body.classification
    const perm = wantsClassification ? 'Manage classifications' : 'Edit transcripts'
    const ctx = await requireAuth(req, res, perm)
    if (!ctx) return
    const { sql, user } = ctx
    const rows = await sql`SELECT file_name FROM transcripts WHERE id = ${id}`
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })

    if (Array.isArray(req.body.segments)) {
      await sql`UPDATE transcripts SET segments = ${JSON.stringify(req.body.segments)} WHERE id = ${id}`
      await audit(sql, user, 'Edit', `Saved transcript changes to ${rows[0].file_name}`, req)
    }
    if (wantsClassification) {
      await sql`UPDATE transcripts SET classification = ${req.body.classification} WHERE id = ${id}`
      await audit(sql, user, 'Admin', `Reclassified ${rows[0].file_name} as ${req.body.classification}`, req)
    }
    return res.json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const ctx = await requireAuth(req, res, 'Manage classifications')
    if (!ctx) return
    const rows = await ctx.sql`DELETE FROM transcripts WHERE id = ${id} RETURNING file_name, audio_url`
    if (!rows[0]) return res.status(404).json({ error: 'Not found' })
    if (rows[0].audio_url) {
      try { await del(rows[0].audio_url) } catch { /* blob may already be gone */ }
    }
    await audit(ctx.sql, ctx.user, 'Admin', `Deleted transcript ${rows[0].file_name}`, req)
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
