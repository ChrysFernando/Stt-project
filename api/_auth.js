// Session authentication + RBAC enforcement for every API endpoint.
const { db, audit } = require('./_db.js')
const { signToken, verifyToken } = require('./_crypto.js')

const COOKIE = 'vs_session'

function parseCookies(req) {
  const out = {}
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=')
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  }
  return out
}

function setSessionCookie(res, token, maxAgeSecs) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    'Path=/', 'HttpOnly', 'Secure', 'SameSite=Lax',
  ]
  if (maxAgeSecs !== undefined) parts.push(`Max-Age=${maxAgeSecs}`)
  res.setHeader('Set-Cookie', parts.join('; '))
}

async function getSecret(sql) {
  const rows = await sql`SELECT value FROM app_config WHERE key = 'session_secret'`
  return rows[0].value
}

async function getSettings(sql) {
  const rows = await sql`SELECT * FROM settings WHERE id = 1`
  return rows[0]
}

// Verifies the session cookie, applies the sliding timeout, loads the user
// with role permissions. On failure responds 401/403 and returns null.
async function requireAuth(req, res, permission) {
  let sql
  try {
    sql = await db()
  } catch (e) {
    res.status(e.statusCode || 500).json({ error: e.message })
    return null
  }

  const token = parseCookies(req)[COOKIE]
  const secret = await getSecret(sql)
  const payload = token ? verifyToken(token, secret) : null
  if (!payload || !payload.sid) {
    res.status(401).json({ error: 'Not signed in.' })
    return null
  }

  const settings = await getSettings(sql)
  const rows = await sql`
    SELECT s.id AS sid, s.expires_at, u.id, u.name, u.email, u.active,
           u.must_change_password, r.name AS role, r.perms
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    JOIN roles r ON r.id = u.role_id
    WHERE s.id = ${payload.sid}`
  const row = rows[0]
  if (!row || new Date(row.expires_at) < new Date() || !row.active) {
    if (row) await sql`DELETE FROM sessions WHERE id = ${row.sid}`
    setSessionCookie(res, '', 0)
    res.status(401).json({ error: 'Session expired. Please sign in again.' })
    return null
  }

  // Sliding timeout: activity extends the session (spec 5.3).
  await sql`UPDATE sessions SET expires_at = now() + make_interval(mins => ${settings.session_timeout_mins})
            WHERE id = ${row.sid}`

  const user = { id: row.id, name: row.name, email: row.email, role: row.role, perms: row.perms, mustChangePassword: row.must_change_password }
  if (permission && !user.perms.includes(permission)) {
    await audit(sql, user, 'Admin', `DENIED: attempted "${permission}"`, req)
    res.status(403).json({ error: `Your role does not include the "${permission}" permission.` })
    return null
  }
  return { sql, user, settings, sid: row.sid }
}

module.exports = { requireAuth, setSessionCookie, getSecret, getSettings, parseCookies, signToken, COOKIE }
