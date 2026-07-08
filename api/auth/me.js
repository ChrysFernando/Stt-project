const { requireAuth } = require('../_auth.js')

module.exports = async (req, res) => {
  const ctx = await requireAuth(req, res)
  if (!ctx) return
  res.json({ user: ctx.user })
}
