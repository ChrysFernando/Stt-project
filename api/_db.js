// Database access + one-time schema/seed. Neon serverless Postgres over HTTP.
const { neon } = require('@neondatabase/serverless')
const crypto = require('node:crypto')
const { hashPassword } = require('./_crypto.js')

const DB_URL = () =>
  process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_UNPOOLED || null

let sqlClient = null
let readyPromise = null

function isDbConfigured() {
  return Boolean(DB_URL())
}

async function ensureSchema(sql) {
  await sql`CREATE TABLE IF NOT EXISTS app_config (
    key TEXT PRIMARY KEY, value TEXT NOT NULL)`
  await sql`CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL,
    built_in BOOLEAN NOT NULL DEFAULT FALSE, perms JSONB NOT NULL)`
  await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role_id INT NOT NULL REFERENCES roles(id),
    active BOOLEAN NOT NULL DEFAULT TRUE, last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  await sql`CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL)`
  await sql`CREATE TABLE IF NOT EXISTS transcripts (
    id TEXT PRIMARY KEY, file_name TEXT NOT NULL,
    owner_id INT REFERENCES users(id),
    classification TEXT NOT NULL DEFAULT 'Restricted',
    language TEXT, duration INT,
    status TEXT NOT NULL DEFAULT 'completed', error TEXT,
    segments JSONB NOT NULL DEFAULT '[]',
    audio_url TEXT, audio_ext TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now())`
  // Append-only by construction: the application has no UPDATE/DELETE path.
  await sql`CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY, at TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id INT, user_name TEXT NOT NULL,
    action TEXT NOT NULL, detail TEXT NOT NULL, ip TEXT)`
  await sql`CREATE TABLE IF NOT EXISTS settings (
    id INT PRIMARY KEY DEFAULT 1,
    min_password_length INT NOT NULL DEFAULT 12,
    require_complexity BOOLEAN NOT NULL DEFAULT TRUE,
    session_timeout_mins INT NOT NULL DEFAULT 30,
    max_concurrent_sessions INT NOT NULL DEFAULT 1,
    storage_mode TEXT NOT NULL DEFAULT 'Cloud')`

  await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`

  // Session-signing secret lives in the DB so no extra env var is needed.
  await sql`INSERT INTO app_config (key, value) VALUES ('session_secret', ${crypto.randomBytes(32).toString('hex')})
            ON CONFLICT (key) DO NOTHING`

  const ALL_PERMS = [
    'Upload audio', 'View transcripts', 'Edit transcripts', 'Export documents',
    'Manage classifications', 'Manage users & roles', 'View audit logs',
  ]
  const roleCount = await sql`SELECT count(*)::int AS n FROM roles`
  if (roleCount[0].n === 0) {
    await sql`INSERT INTO roles (name, built_in, perms) VALUES
      ('Administrator', TRUE, ${JSON.stringify(ALL_PERMS)}),
      ('Transcription Clerk', TRUE, ${JSON.stringify(['Upload audio', 'View transcripts', 'Edit transcripts', 'Export documents'])}),
      ('Legal Researcher', TRUE, ${JSON.stringify(['View transcripts', 'Export documents'])}),
      ('Auditor', TRUE, ${JSON.stringify(['View transcripts', 'View audit logs'])})`
  }

  const userCount = await sql`SELECT count(*)::int AS n FROM users`
  if (userCount[0].n === 0) {
    const hash = hashPassword('Admin@2026!')
    await sql`INSERT INTO users (name, email, password_hash, role_id, active)
      VALUES ('System Administrator', 'admin@voicescript.local', ${hash},
              (SELECT id FROM roles WHERE name = 'Administrator'), TRUE)`
    await sql`INSERT INTO audit_events (user_name, action, detail, ip)
      VALUES ('system', 'Admin', 'Initial administrator account seeded', 'server')`
  }
}

// Returns a ready-to-use sql client (schema ensured once per instance).
async function db() {
  const url = DB_URL()
  if (!url) {
    const err = new Error('Database is not configured. Create a Neon Postgres database in Vercel Storage and connect it to this project.')
    err.statusCode = 503
    throw err
  }
  if (!sqlClient) sqlClient = neon(url)
  if (!readyPromise) readyPromise = ensureSchema(sqlClient)
  await readyPromise
  return sqlClient
}

async function audit(sql, user, action, detail, req) {
  const ip = (req && (req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || null
  await sql`INSERT INTO audit_events (user_id, user_name, action, detail, ip)
    VALUES (${user ? user.id : null}, ${user ? user.name : 'anonymous'}, ${action}, ${detail}, ${ip})`
}

module.exports = { db, audit, isDbConfigured }
