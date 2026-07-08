const { requireAuth } = require('./_auth.js')
const { audit } = require('./_db.js')

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const mine = req.query.mine === '1'
    // Anyone may see their own recent activity; the full log needs the permission.
    const ctx = await requireAuth(req, res, mine ? undefined : 'View audit logs')
    if (!ctx) return
    const rows = mine
      ? await ctx.sql`SELECT id, to_char(at, 'YYYY-MM-DD HH24:MI') AS time, user_name AS "user", action, detail, ip
                      FROM audit_events WHERE user_id = ${ctx.user.id} ORDER BY id DESC LIMIT 20`
      : await ctx.sql`SELECT id, to_char(at, 'YYYY-MM-DD HH24:MI') AS time, user_name AS "user", action, detail, ip
                      FROM audit_events ORDER BY id DESC LIMIT 300`
    return res.json(rows)
  }

  if (req.method === 'POST') {
    // Client-side events that the server cannot observe (exports happen in-browser).
    const ctx = await requireAuth(req, res)
    if (!ctx) return
    const { action, detail } = req.body || {}
    if (!['Export'].includes(action) || !detail) return res.status(400).json({ error: 'Invalid event.' })
    await audit(ctx.sql, ctx.user, action, String(detail).slice(0, 300), req)
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
