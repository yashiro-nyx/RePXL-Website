/**
 * Serverless-safe password-reset token store, backed by the Prisma
 * `PasswordResetToken` table.
 *
 * Security notes:
 * - The RAW token is only ever placed in the reset-link email.
 * - We persist only a SHA-256 hash of the token, so a database read cannot be
 *   used to mint valid reset links.
 * - Tokens are single-use (marked `usedAt`) and time-limited.
 *
 * This replaces the previous module-level `Map`, which did not survive across
 * serverless invocations / multiple instances on Vercel.
 */

import { createHash } from 'crypto'
import { prisma } from './prisma'

const TOKEN_TTL_MS = 60 * 60 * 1000 // 1 hour

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Persist a reset token for an email. Best-effort cleanup of expired rows.
 */
export async function storeResetToken(token: string, email: string): Promise<void> {
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  // Best-effort cleanup of stale tokens (does not block the main insert).
  await prisma.passwordResetToken
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => undefined)

  await prisma.passwordResetToken.create({
    data: { tokenHash, email: email.toLowerCase(), expiresAt },
  })
}

/**
 * Return the email associated with a still-valid, unused token, or null.
 */
export async function validateResetToken(token: string): Promise<string | null> {
  const entry = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
  })

  if (!entry) return null
  if (entry.usedAt) return null
  if (entry.expiresAt.getTime() < Date.now()) return null

  return entry.email
}

/**
 * Validate and atomically mark a token as used (single-use). Returns the email
 * on success, or null if the token is missing/expired/already used.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  const tokenHash = hashToken(token)

  // updateMany with the guard conditions makes consumption atomic:
  // only an unused, unexpired token is flipped, avoiding double-use races.
  const result = await prisma.passwordResetToken.updateMany({
    where: {
      tokenHash,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { usedAt: new Date() },
  })

  if (result.count === 0) return null

  const entry = await prisma.passwordResetToken.findUnique({ where: { tokenHash } })
  return entry?.email ?? null
}
