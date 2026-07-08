const { requireAuth, setSessionCookie } = require('../_auth.js')
const { audit } = require('../_db.js')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ctx = await requireAuth(req, res)
  if (!ctx) return
  await ctx.sql`DELETE FROM sessions WHERE id = ${ctx.sid}`
  await audit(ctx.sql, ctx.user, 'Login', 'Signed out', req)
  setSessionCookie(res, '', 0)
  res.json({ ok: true })
}
