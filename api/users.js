const { requireAuth } = require('./_auth.js')
const { audit } = require('./_db.js')
const { hashPassword, passwordPolicyError } = require('./_crypto.js')

module.exports = async (req, res) => {
  const ctx = await requireAuth(req, res, 'Manage users & roles')
  if (!ctx) return
  const { sql, user, settings } = ctx

  if (req.method === 'GET') {
    const rows = await sql`
      SELECT u.id, u.name, u.email, u.active, r.name AS role,
             to_char(u.last_login, 'YYYY-MM-DD HH24:MI') AS last_login
      FROM users u JOIN roles r ON r.id = u.role_id ORDER BY u.id`
    return res.json(rows.map((r) => ({ ...r, lastLogin: r.last_login || '—' })))
  }

  if (req.method === 'POST') {
    const { name, email, role, password } = req.body || {}
    if (!name || !email || !role || !password) {
      return res.status(400).json({ error: 'Name, email, role and password are required.' })
    }
    const policyError = passwordPolicyError(password, settings)
    if (policyError) return res.status(400).json({ error: policyError })
    const roleRows = await sql`SELECT id FROM roles WHERE name = ${role}`
    if (!roleRows[0]) return res.status(400).json({ error: 'Unknown role.' })
    const dup = await sql`SELECT id FROM users WHERE lower(email) = ${String(email).toLowerCase()}`
    if (dup[0]) return res.status(409).json({ error: 'An account with this email already exists.' })

    await sql`INSERT INTO users (name, email, password_hash, role_id)
              VALUES (${name}, ${email}, ${hashPassword(password)}, ${roleRows[0].id})`
    await audit(sql, user, 'Admin', `Created account ${email} (${role})`, req)
    return res.json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const { id, action, password, role } = req.body || {}
    const target = (await sql`SELECT u.*, r.name AS role FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ${id}`)[0]
    if (!target) return res.status(404).json({ error: 'User not found.' })

    if (action === 'toggle') {
      if (target.id === user.id) return res.status(400).json({ error: 'You cannot deactivate your own account.' })
      await sql`UPDATE users SET active = ${!target.active} WHERE id = ${id}`
      if (target.active) await sql`DELETE FROM sessions WHERE user_id = ${id}`
      await audit(sql, user, 'Admin', `${target.active ? 'Deactivated' : 'Reactivated'} account ${target.email}`, req)
      return res.json({ ok: true })
    }
    if (action === 'setPassword') {
      const policyError = passwordPolicyError(password || '', settings)
      if (policyError) return res.status(400).json({ error: policyError })
      await sql`UPDATE users SET password_hash = ${hashPassword(password)} WHERE id = ${id}`
      await sql`DELETE FROM sessions WHERE user_id = ${id} AND id <> ${ctx.sid}`
      await audit(sql, user, 'Admin', `Reset password for ${target.email}`, req)
      return res.json({ ok: true })
    }
    if (action === 'setRole') {
      const roleRows = await sql`SELECT id FROM roles WHERE name = ${role}`
      if (!roleRows[0]) return res.status(400).json({ error: 'Unknown role.' })
      await sql`UPDATE users SET role_id = ${roleRows[0].id} WHERE id = ${id}`
      await audit(sql, user, 'Admin', `Changed role of ${target.email} to ${role}`, req)
      return res.json({ ok: true })
    }
    if (action === 'delete') {
      if (target.id === user.id) return res.status(400).json({ error: 'You cannot remove your own account.' })
      // Never remove the last remaining active user manager.
      const managers = await sql`
        SELECT count(*)::int AS n FROM users u JOIN roles r ON r.id = u.role_id
        WHERE u.active AND u.id <> ${id} AND r.perms @> '["Manage users & roles"]'`
      const targetIsManager = (await sql`
        SELECT r.perms @> '["Manage users & roles"]' AS m FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = ${id}`)[0].m
      if (targetIsManager && managers[0].n === 0) {
        return res.status(400).json({ error: 'Cannot remove the last administrator account.' })
      }
      await sql`UPDATE transcripts SET owner_id = NULL WHERE owner_id = ${id}`
      await sql`DELETE FROM sessions WHERE user_id = ${id}`
      await sql`DELETE FROM users WHERE id = ${id}`
      await audit(sql, user, 'Admin', `Permanently removed account ${target.email} (${target.role})`, req)
      return res.json({ ok: true })
    }
    return res.status(400).json({ error: 'Unknown action.' })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
