import { randomBytes } from 'crypto'
import { checkRecentAuth } from '@/lib/auth-helpers'
import type { CustomerMfa, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  decryptSecret,
  digest,
  encryptSecret,
  encryptionKey,
  generateSecret,
  matchesHash,
  recoveryCodes,
  recoveryHash,
  validStep,
} from './crypto'

const TTL = 5 * 60 * 1000
const WINDOW = 15 * 60 * 1000
// MFA uses serialized row locks and several security checks. Supabase pooler
// round trips can exceed Prisma's 5-second interactive-transaction default
// while the database remains reachable, so keep a bounded MFA-specific window.
export const MFA_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const
export const CHALLENGE_COOKIE = 'repixl-mfa-challenge'
export type MfaAction =
  | 'begin'
  | 'confirm'
  | 'acknowledge'
  | 'disable'
  | 'regenerate'
  | 'cancel'
const denied = (error = "We couldn't verify your identity. Please try again.") => ({
  ok: false as const,
  status: 401,
  error,
})
const limited = () => ({
  ok: false as const,
  status: 429,
  error: 'Too many attempts. Try again in 15 minutes.',
})

async function lockedCustomer(tx: Prisma.TransactionClient, userId: string) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
  const user = await tx.user.findUnique({ where: { id: userId } })
  return user && user.role === 'CUSTOMER' && !user.isArchived ? user : null
}
async function settings(tx: Prisma.TransactionClient, userId: string) {
  return tx.customerMfa.upsert({
    where: { userId },
    create: { userId },
    update: {},
  })
}
// The account row lock serializes this budget across instances/challenges.
// Return errors instead of throwing so unsuccessful attempts commit.
async function attempt(tx: Prisma.TransactionClient, mfa: CustomerMfa) {
  const reset = Date.now() - mfa.windowStartedAt.getTime() >= WINDOW
  if (!reset && mfa.attempts >= 10) return false
  await tx.customerMfa.update({
    where: { userId: mfa.userId },
    data: {
      attempts: reset ? 1 : mfa.attempts + 1,
      ...(reset ? { windowStartedAt: new Date() } : {}),
    },
  })
  return true
}
async function factor(
  tx: Prisma.TransactionClient,
  mfa: CustomerMfa,
  code: string
) {
  if (!mfa.secret) return null
  const step = validStep(
    decryptSecret(mfa.secret, mfa.userId),
    code,
    mfa.lastStep
  )
  if (step !== null) {
    await tx.customerMfa.update({
      where: { userId: mfa.userId },
      data: { lastStep: step },
    })
    return 'totp' as const
  }
  const hash = recoveryHash(code)
  if (!mfa.enabledAt || !mfa.recoveryHashes.some((h) => matchesHash(h, hash)))
    return null
  await tx.customerMfa.update({
    where: { userId: mfa.userId },
    data: {
      recoveryHashes: mfa.recoveryHashes.filter((h) => !matchesHash(h, hash)),
    },
  })
  return 'recovery' as const
}
function proof(version: number, primaryAt: number) {
  return { mfaVersion: version, mfaVerified: true, primaryAt }
}

export async function primaryLogin(userId: string, primaryAt = Date.now(), expectedEmail?: string) {
  return prisma.$transaction(async (tx) => {
    const user = await lockedCustomer(tx, userId)
    if (!user || (expectedEmail !== undefined && user.email.toLowerCase() !== expectedEmail.toLowerCase())) return denied()
    const mfa = await settings(tx, userId)
    if (!mfa.enabledAt)
      return {
        ok: true as const,
        user,
        proof: { mfaVersion: mfa.version, primaryAt },
        challenge: null,
      }
    encryptionKey()
    if (!(await attempt(tx, mfa))) return limited()
    const token = randomBytes(32).toString('base64url')
    await tx.customerMfaChallenge.deleteMany({ where: { userId } })
    await tx.customerMfaChallenge.create({
      data: {
        tokenHash: digest(token),
        userId,
        version: mfa.version,
        primaryAt: new Date(primaryAt),
        expiresAt: new Date(Date.now() + TTL),
      },
    })
    return { ok: true as const, user, challenge: token, proof: null }
  }, MFA_TRANSACTION_OPTIONS)
}

export async function completeChallenge(token: string, code: string) {
  encryptionKey()
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return denied()
  return prisma.$transaction(async (tx) => {
    const initial = await tx.customerMfaChallenge.findUnique({
      where: { tokenHash: digest(token) },
    })
    if (!initial) return denied()
    const user = await lockedCustomer(tx, initial.userId)
    if (!user) return denied()
    const challenge = await tx.customerMfaChallenge.findUnique({
      where: { tokenHash: digest(token) },
    })
    const mfa = await settings(tx, user.id)
    if (
      !challenge ||
      challenge.expiresAt.getTime() <= Date.now() ||
      challenge.version !== mfa.version ||
      !mfa.enabledAt
    )
      return denied()
    if (!(await attempt(tx, mfa))) return limited()
    const used = await factor(tx, mfa, code)
    if (!used) return denied()
    await tx.customerMfaChallenge.delete({
      where: { tokenHash: challenge.tokenHash },
    })
    return {
      ok: true as const,
      user,
      proof: proof(mfa.version, challenge.primaryAt.getTime()),
      recoveryUsed: used === 'recovery',
    }
  }, MFA_TRANSACTION_OPTIONS)
}

export async function manageMfa(
  userId: string,
  action: MfaAction,
  input: { code?: string; saved?: boolean },
  primaryAt: number,
  sessionVersion: number
) {
  encryptionKey()
  return prisma.$transaction(async (tx) => {
    const user = await lockedCustomer(tx, userId)
    if (!user) return denied()
    const mfa = await settings(tx, userId)
    // Recheck the session version under the same lock as MFA mutations.
    if (mfa.version !== sessionVersion) return denied()
    if (!(await attempt(tx, mfa))) return limited()
    if (['begin', 'disable', 'regenerate'].includes(action)) {
      if (!user.password) return {
        ok: false as const, status: 403,
        error: 'Set a RePXL password before changing two-factor authentication.',
      }
      // The same signed, session-bound verification used by the HTTP guard;
      // recheck the canonical DB record under the account lock.
      if (!await checkRecentAuth(userId, 'password', tx)) return denied('Enter your current password to continue.')
    }
    if (action === 'begin') {
      if (mfa.enabledAt) return denied()
      const secret = generateSecret()
      await tx.customerMfa.update({
        where: { userId },
        data: {
          secret: encryptSecret(secret, userId),
          pendingExpiresAt: new Date(Date.now() + TTL),
          lastStep: -1,
        },
      })
      return { ok: true as const, setup: { secret, email: user.email } }
    }
    if (action === 'cancel') {
      if (mfa.enabledAt) return denied()
      await tx.customerMfa.update({
        where: { userId },
        data: { secret: null, pendingExpiresAt: null },
      })
      return { ok: true as const }
    }
    if (action === 'acknowledge') {
      if (!mfa.enabledAt || input.saved !== true) return denied()
      await tx.customerMfa.update({
        where: { userId },
        data: { recoveryAcknowledged: true },
      })
      return { ok: true as const }
    }
    if (action === 'confirm') {
      if (
        mfa.enabledAt ||
        !mfa.pendingExpiresAt ||
        mfa.pendingExpiresAt.getTime() <= Date.now()
      )
        return denied('Authenticator setup has expired or is already complete. Refresh this page to continue.')
    } else if (!mfa.enabledAt) return denied()
    const used = await factor(tx, mfa, input.code ?? '')
    if (!used) return denied('That code is incorrect, expired, or already used. Enter a new authenticator code or an unused recovery code.')
    const version = mfa.version + 1
    await tx.customerMfaChallenge.deleteMany({ where: { userId } })
    if (action === 'disable') {
      await tx.customerMfa.update({
        where: { userId },
        data: {
          secret: null,
          enabledAt: null,
          pendingExpiresAt: null,
          lastStep: -1,
          recoveryHashes: [],
          recoveryAcknowledged: false,
          version,
        },
      })
      return {
        ok: true as const,
        proof: proof(version, primaryAt),
        email: user.email,
        event: 'MFA disabled',
        recoveryUsed: used === 'recovery',
      }
    }
    const codes = recoveryCodes()
    await tx.customerMfa.update({
      where: { userId },
      data: {
        enabledAt: mfa.enabledAt ?? new Date(),
        pendingExpiresAt: null,
        recoveryHashes: codes.map(recoveryHash),
        recoveryAcknowledged: false,
        version,
      },
    })
    return {
      ok: true as const,
      codes,
      proof: proof(version, primaryAt),
      email: user.email,
      event:
        action === 'confirm' ? 'MFA enabled' : 'Recovery codes regenerated',
      recoveryUsed: used === 'recovery',
    }
  }, MFA_TRANSACTION_OPTIONS)
}

/**
 * Step-up TOTP verification for an MFA-enabled customer.
 *
 * Reuses the SAME row lock, rate-limit budget, and anti-replay `factor` used by
 * login/challenge, so it cannot be replayed and cannot weaken MFA. It does NOT
 * issue a login proof, change the MFA version, or alter enable/disable state —
 * it only tells the caller whether the customer proved possession of their
 * authenticator (or a recovery code). The caller (recent-auth route) issues the
 * normal recent-auth window on success.
 *
 * Returns:
 *   { ok: true, method: 'totp' | 'recovery' } on a valid code
 *   { ok: false, status } otherwise (401 not verified, 429 rate-limited, 400 not enabled)
 */
export async function verifyStepUpTotp(userId: string, code: string) {
  encryptionKey()
  return prisma.$transaction(async (tx) => {
    const user = await lockedCustomer(tx, userId)
    if (!user) return { ok: false as const, status: 401 }
    const mfa = await settings(tx, userId)
    if (!mfa.enabledAt) return { ok: false as const, status: 400 } // 2FA not enabled
    if (!(await attempt(tx, mfa))) return { ok: false as const, status: 429 }
    const used = await factor(tx, mfa, code ?? '')
    if (!used) return { ok: false as const, status: 401 }
    return { ok: true as const, method: used }
  }, MFA_TRANSACTION_OPTIONS)
}
