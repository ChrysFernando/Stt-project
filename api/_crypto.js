// Password hashing (scrypt, built into Node) and signed session tokens.
const crypto = require('node:crypto')

const SCRYPT_OPTS = { N: 16384, r: 8, p: 1 }

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64, SCRYPT_OPTS).toString('hex')
  return `scrypt$${salt}$${hash}`
}

function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$')
  if (scheme !== 'scrypt' || !salt || !hash) return false
  const candidate = crypto.scryptSync(password, salt, 64, SCRYPT_OPTS)
  const expected = Buffer.from(hash, 'hex')
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)
}

// Token format: base64url(payloadJSON).base64url(hmacSHA256(payload, secret))
function signToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${sig}`
}

function verifyToken(token, secret) {
  const [body, sig] = String(token || '').split('.')
  if (!body || !sig) return null
  const expected = crypto.createHmac('sha256', secret).update(body).digest('base64url')
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString())
  } catch {
    return null
  }
}

function passwordPolicyError(password, settings) {
  if (password.length < settings.min_password_length) {
    return `Password must be at least ${settings.min_password_length} characters.`
  }
  if (settings.require_complexity) {
    const ok = /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
    if (!ok) return 'Password must include lower case, upper case, a digit and a symbol.'
  }
  return null
}

module.exports = { hashPassword, verifyPassword, signToken, verifyToken, passwordPolicyError }
