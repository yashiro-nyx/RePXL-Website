/**
 * Sensitive profile change utilities — OTP generation, hashing, and email delivery.
 * Pure helpers + thin DB wrappers. No HTTP I/O.
 */

import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/mailer'
import { buildVerificationCodeEmail, buildSecurityNoticeEmail } from '@/lib/email'
import type { SensitiveChangeType } from '@prisma/client'

import {
  generateOtp,
  hashOtp,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from '@/lib/sensitive-change-utils'

export {
  generateOtp,
  hashOtp,
  OTP_DIGITS,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_MAX_ATTEMPTS,
} from '@/lib/sensitive-change-utils'

import type { Prisma } from '@prisma/client'
export async function lockSensitiveCustomer(
  tx: Prisma.TransactionClient,
  userId: string
) {
  await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`
  const user = await tx.user.findUnique({ where: { id: userId } })
  if (!user || user.isArchived || user.role !== 'CUSTOMER')
    throw new Error('Authentication required')
  return user
}
export const authorizationWhere = (
  userId: string,
  changeType: SensitiveChangeType
) => ({
  userId,
  changeType,
  usedAt: { gte: new Date(Date.now() - 300000) },
  expiresAt: { gt: new Date() },
})
export async function isOnResendCooldown(
  userId: string,
  changeType: SensitiveChangeType
) {
  const row = await prisma.sensitiveChangeChallenge.findFirst({
    where: { userId, changeType },
    orderBy: { lastSentAt: 'desc' },
  })
  return !!row && Date.now() - row.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
}
export async function createChallenge(
  userId: string,
  changeType: SensitiveChangeType,
  pendingEmail?: string
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const user = await lockSensitiveCustomer(tx, userId)
    if (changeType.startsWith('CHANGE_EMAIL') && !user.password)
      throw new Error('Managed through Google')
    const latest = await tx.sensitiveChangeChallenge.findFirst({
      where: { userId, changeType },
      orderBy: { lastSentAt: 'desc' },
    })
    if (
      latest &&
      Date.now() - latest.lastSentAt.getTime() < OTP_RESEND_COOLDOWN_MS
    )
      throw new Error('Resend cooldown')
    if (changeType === 'CHANGE_EMAIL_VERIFY_NEW') {
      if (!pendingEmail) throw new Error('New email required')
      const old = await tx.sensitiveChangeChallenge.findFirst({
        where: authorizationWhere(userId, 'CHANGE_EMAIL_VERIFY_OLD'),
      })
      if (!old) throw new Error('Verify current email first')
      await tx.sensitiveChangeChallenge.update({
        where: { id: old.id },
        data: { pendingEmail },
      })
    }
    if (changeType === 'CHANGE_EMAIL_VERIFY_OLD')
      await tx.sensitiveChangeChallenge.deleteMany({
        where: { userId, changeType: 'CHANGE_EMAIL_VERIFY_NEW' },
      })
    await tx.sensitiveChangeChallenge.deleteMany({
      where: { userId, changeType },
    })
    const otp = generateOtp()
    await tx.sensitiveChangeChallenge.create({
      data: {
        userId,
        changeType,
        codeHash: hashOtp(otp),
        pendingEmail: pendingEmail ?? null,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    })
    return otp
  })
}
export async function verifyChallenge(
  userId: string,
  changeType: SensitiveChangeType,
  code: string,
  pendingEmail?: string
) {
  return prisma.$transaction(async (tx) => {
    const user = await lockSensitiveCustomer(tx, userId)
    if (changeType.startsWith('CHANGE_EMAIL') && !user.password)
      return {
        ok: false as const,
        error: 'Managed through Google',
        tooManyAttempts: false,
      }
    const challenge = await tx.sensitiveChangeChallenge.findFirst({
      where: { userId, changeType, usedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!challenge || challenge.expiresAt.getTime() <= Date.now())
      return {
        ok: false as const,
        error: 'Verification expired or already used.',
        tooManyAttempts: false,
      }
    if (challenge.attempts >= OTP_MAX_ATTEMPTS)
      return {
        ok: false as const,
        error: 'Too many attempts.',
        tooManyAttempts: true,
      }
    if (
      hashOtp(code.trim()) !== challenge.codeHash ||
      (changeType === 'CHANGE_EMAIL_VERIFY_NEW' &&
        pendingEmail !== challenge.pendingEmail)
    ) {
      await tx.sensitiveChangeChallenge.update({
        where: { id: challenge.id },
        data: { attempts: { increment: 1 } },
      })
      return {
        ok: false as const,
        error: 'Invalid verification code.',
        tooManyAttempts: challenge.attempts + 1 >= OTP_MAX_ATTEMPTS,
      }
    }
    await tx.sensitiveChangeChallenge.update({
      where: { id: challenge.id },
      data: { usedAt: new Date() },
    })
    return {
      ok: true as const,
      challenge: { id: challenge.id, pendingEmail: challenge.pendingEmail },
    }
  })
}
export async function consumeAuthorization(
  tx: Prisma.TransactionClient,
  userId: string,
  changeType: SensitiveChangeType,
  pendingEmail?: string
) {
  const row = await tx.sensitiveChangeChallenge.findFirst({
    where: {
      ...authorizationWhere(userId, changeType),
      ...(pendingEmail ? { pendingEmail } : {}),
    },
  })
  if (!row) throw new Error('Verification required or already consumed.')
  await tx.sensitiveChangeChallenge.delete({ where: { id: row.id } })
}

// ── Email senders ─────────────────────────────────────────────────────────────

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  changeType: SensitiveChangeType
): Promise<void> {
  const ttlMins = Math.round(OTP_TTL_MS / 60_000)
  const subjects: Record<SensitiveChangeType, string> = {
    CHANGE_EMAIL_VERIFY_OLD: 'Verify your identity — email change request',
    CHANGE_EMAIL_VERIFY_NEW: 'Confirm your new email address — RePXL',
    CHANGE_PHONE: 'Verify your identity — phone number change',
    CHANGE_DOB: 'Verify your identity — date of birth change',
  }
  const purposes: Record<SensitiveChangeType, string> = {
    CHANGE_EMAIL_VERIFY_OLD:
      'verify your identity before changing your email address',
    CHANGE_EMAIL_VERIFY_NEW: 'confirm your new email address',
    CHANGE_PHONE: 'verify your identity before changing your phone number',
    CHANGE_DOB: 'verify your identity before changing your date of birth',
  }
  const { subject, html, text } = buildVerificationCodeEmail({
    subject: subjects[changeType],
    purpose: purposes[changeType],
    code: otp,
    ttlMinutes: ttlMins,
  })
  await sendNotificationEmail(toEmail, subject, text, { html })
}

export async function sendSecurityNotification(
  toEmail: string,
  event: string
): Promise<void> {
  const { subject, html, text } = buildSecurityNoticeEmail({ event })
  await sendNotificationEmail(toEmail, subject, text, { html })
}
