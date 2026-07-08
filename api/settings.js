const { requireAuth } = require('./_auth.js')
const { audit } = require('./_db.js')

module.exports = async (req, res) => {
  const ctx = await requireAuth(req, res, 'Manage users & roles')
  if (!ctx) return
  const { sql, user } = ctx

  if (req.method === 'GET') {
    const s = (await sql`SELECT * FROM settings WHERE id = 1`)[0]
    return res.json({
      minPasswordLength: s.min_password_length,
      requireComplexity: s.require_complexity,
      sessionTimeoutMins: s.session_timeout_mins,
      maxConcurrentSessions: s.max_concurrent_sessions,
      storageMode: s.storage_mode,
    })
  }

  if (req.method === 'PUT') {
    const b = req.body || {}
    const clamp = (v, lo, hi, dflt) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Number(v))) : dflt)
    await sql`UPDATE settings SET
      min_password_length = ${clamp(b.minPasswordLength, 8, 32, 12)},
      require_complexity = ${Boolean(b.requireComplexity)},
      session_timeout_mins = ${clamp(b.sessionTimeoutMins, 5, 240, 30)},
      max_concurrent_sessions = ${clamp(b.maxConcurrentSessions, 1, 5, 1)},
      storage_mode = ${['On-premises', 'Cloud', 'Hybrid'].includes(b.storageMode) ? b.storageMode : 'Cloud'}
      WHERE id = 1`
    await audit(sql, user, 'Admin', 'Updated security settings', req)
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
