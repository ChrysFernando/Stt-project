const { requireAuth } = require('./_auth.js')
const { audit } = require('./_db.js')

const ALL_PERMS = [
  'Upload audio', 'View transcripts', 'Edit transcripts', 'Export documents',
  'Manage classifications', 'Manage users & roles', 'View audit logs',
]

module.exports = async (req, res) => {
  const ctx = await requireAuth(req, res, req.method === 'GET' ? 'Manage users & roles' : 'Manage users & roles')
  if (!ctx) return
  const { sql, user } = ctx

  if (req.method === 'GET') {
    const rows = await sql`SELECT id, name, built_in AS "builtIn", perms FROM roles ORDER BY id`
    return res.json(rows)
  }

  if (req.method === 'POST') {
    const { name } = req.body || {}
    if (!name || !name.trim()) return res.status(400).json({ error: 'Role name is required.' })
    const dup = await sql`SELECT id FROM roles WHERE lower(name) = ${name.trim().toLowerCase()}`
    if (dup[0]) return res.status(409).json({ error: 'A role with this name already exists.' })
    await sql`INSERT INTO roles (name, built_in, perms) VALUES (${name.trim()}, FALSE, ${JSON.stringify(['View transcripts'])})`
    await audit(sql, user, 'Admin', `Created custom role "${name.trim()}"`, req)
    return res.json({ ok: true })
  }

  if (req.method === 'PATCH') {
    const { id, perm } = req.body || {}
    if (!ALL_PERMS.includes(perm)) return res.status(400).json({ error: 'Unknown permission.' })
    const role = (await sql`SELECT * FROM roles WHERE id = ${id}`)[0]
    if (!role) return res.status(404).json({ error: 'Role not found.' })
    if (role.name === 'Administrator') return res.status(400).json({ error: 'The Administrator role cannot be reduced.' })
    const has = role.perms.includes(perm)
    const next = has ? role.perms.filter((p) => p !== perm) : [...role.perms, perm]
    await sql`UPDATE roles SET perms = ${JSON.stringify(next)} WHERE id = ${id}`
    await audit(sql, user, 'Admin', `${has ? 'Revoked' : 'Granted'} "${perm}" ${has ? 'from' : 'to'} role ${role.name}`, req)
    return res.json({ ok: true })
  }

  res.status(405).json({ error: 'Method not allowed' })
}
