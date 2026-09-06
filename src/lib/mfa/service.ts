import { randomBytes } from 'crypto'
import bcrypt from 'bcryptjs'
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
export const CHALLENGE_COOKIE = 'repixl-mfa-challenge'
export type MfaAction =
  | 'begin'
  | 'confirm'
  | 'acknowledge'
  | 'disable'
  | 'regenerate'
  | 'cancel'
const denied = () => ({
  ok: false as const,
  status: 401,
  error: 'Authentication could not be verified.',
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
  })
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
  })
}

export async function manageMfa(
  userId: string,
  action: MfaAction,
  input: { password?: string; code?: string; saved?: boolean },
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
      const recent = user.password
        ? await bcrypt.compare(input.password ?? '', user.password)
        : primaryAt > 0 &&
          primaryAt <= Date.now() &&
          Date.now() - primaryAt <= TTL
      if (!recent) return denied()
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
        return denied()
    } else if (!mfa.enabledAt) return denied()
    const used = await factor(tx, mfa, input.code ?? '')
    if (!used) return denied()
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
  })
}
