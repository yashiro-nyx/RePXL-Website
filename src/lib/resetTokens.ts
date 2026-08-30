/**
 * Server-side in-memory store for password reset tokens.
 * Tokens are never exposed to the client — only validated via API route.
 * In production with multiple instances, swap this for Redis or a DB table.
 */

interface ResetToken {
  email: string
  expiresAt: number // Unix ms
}

// Module-level Map persists across requests in the same Node.js process
const tokens = new Map<string, ResetToken>()

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

export function storeResetToken(token: string, email: string): void {
  // Clean up expired tokens before inserting
  const now = Date.now()
  tokens.forEach((v, k) => { if (now > v.expiresAt) tokens.delete(k) })
  tokens.set(token, { email, expiresAt: now + TOKEN_TTL_MS })
}

export function validateResetToken(token: string): string | null {
  const entry = tokens.get(token)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    tokens.delete(token)
    return null
  }
  return entry.email
}

export function consumeResetToken(token: string): string | null {
  const email = validateResetToken(token)
  if (email) tokens.delete(token) // single-use
  return email
}
