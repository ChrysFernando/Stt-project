const { requireAuth } = require('../_auth.js')
const { audit } = require('../_db.js')
const { hashPassword, verifyPassword, passwordPolicyError } = require('../_crypto.js')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const ctx = await requireAuth(req, res)
  if (!ctx) return
  const { sql, user, settings } = ctx

  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' })
  }
  const row = (await sql`SELECT password_hash FROM users WHERE id = ${user.id}`)[0]
  if (!verifyPassword(currentPassword, row.password_hash)) {
    await audit(sql, user, 'Admin', 'FAILED password change (wrong current password)', req)
    return res.status(401).json({ error: 'Current password is incorrect.' })
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: 'The new password must be different from the current one.' })
  }
  const policyError = passwordPolicyError(newPassword, settings)
  if (policyError) return res.status(400).json({ error: policyError })

  await sql`UPDATE users SET password_hash = ${hashPassword(newPassword)}, must_change_password = FALSE
            WHERE id = ${user.id}`
  // Changing the password signs out every other device.
  await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND id <> ${ctx.sid}`
  await audit(sql, user, 'Admin', 'Changed own password', req)
  res.json({ ok: true })
}
