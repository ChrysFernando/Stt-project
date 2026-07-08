const crypto = require('node:crypto')
const { db, audit } = require('../_db.js')
const { verifyPassword } = require('../_crypto.js')
const { setSessionCookie, getSecret, getSettings, signToken } = require('../_auth.js')

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  let sql
  try {
    sql = await db()
  } catch (e) {
    return res.status(e.statusCode || 500).json({ error: e.message })
  }

  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required.' })

  const rows = await sql`
    SELECT u.*, r.name AS role, r.perms FROM users u JOIN roles r ON r.id = u.role_id
    WHERE lower(u.email) = ${String(email).toLowerCase()}`
  const user = rows[0]

  if (!user || !verifyPassword(password, user.password_hash)) {
    await audit(sql, { id: user ? user.id : null, name: email }, 'Login', 'FAILED sign-in attempt', req)
    return res.status(401).json({ error: 'Incorrect email or password.' })
  }
  if (!user.active) {
    await audit(sql, user, 'Login', 'DENIED: account deactivated', req)
    return res.status(403).json({ error: 'This account has been deactivated.' })
  }

  const settings = await getSettings(sql)

  // Concurrent-login restriction (spec 5.3): make room by revoking oldest sessions.
  await sql`DELETE FROM sessions WHERE user_id = ${user.id} AND expires_at < now()`
  const active = await sql`SELECT id FROM sessions WHERE user_id = ${user.id} ORDER BY created_at ASC`
  const excess = active.length - (settings.max_concurrent_sessions - 1)
  if (excess > 0) {
    const ids = active.slice(0, excess).map((s) => s.id)
    await sql`DELETE FROM sessions WHERE id = ANY(${ids})`
  }

  const sid = crypto.randomUUID()
  await sql`INSERT INTO sessions (id, user_id, expires_at)
            VALUES (${sid}, ${user.id}, now() + make_interval(mins => ${settings.session_timeout_mins}))`
  await sql`UPDATE users SET last_login = now() WHERE id = ${user.id}`
  await audit(sql, user, 'Login', 'Successful sign-in', req)

  const token = signToken({ sid }, await getSecret(sql))
  setSessionCookie(res, token, 60 * 60 * 12) // cookie lifetime; real timeout enforced server-side
  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, perms: user.perms },
  })
}
