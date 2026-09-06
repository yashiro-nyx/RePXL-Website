/**
 * Sensitive profile change utilities — OTP generation, hashing, and email delivery.
 * Pure helpers + thin DB wrappers. No HTTP I/O.
 */

import { prisma } from '@/lib/prisma'
import { sendNotificationEmail } from '@/lib/mailer'
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

const YEAR = new Date().getFullYear()

function emailWrapper(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#0a0806;font-family:sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0a0806">
<tr><td align="center" style="padding:40px 20px;">
<table role="presentation" width="100%" style="max-width:520px;">
<tr><td align="center" style="padding-bottom:24px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="border:1px solid rgba(245,241,236,0.2);padding:6px 14px;">
      <span style="font-family:Georgia,serif;font-size:18px;font-weight:700;color:#f5f1ec;">RePIXL</span>
    </td></tr></table>
</td></tr>
<tr><td style="background:#16131a;border:1px solid rgba(140,133,128,0.15);border-top:3px solid #c22c2c;padding:36px 32px;">
  <h2 style="margin:0 0 16px;font-family:Georgia,serif;font-size:20px;color:#f5f1ec;">${title}</h2>
  ${body}
</td></tr>
<tr><td align="center" style="padding-top:24px;">
  <p style="margin:0;font-family:monospace;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:rgba(140,133,128,0.4);">&copy; ${YEAR} RePIXL</p>
</td></tr>
</table>
</td></tr>
</table></body></html>`
}

function otpBlock(
  code: string,
  purposeLabel: string,
  ttlMinutes: number
): string {
  return `<p style="margin:0 0 20px;font-size:14px;color:#8c8580;line-height:1.6;">
    Your verification code to ${purposeLabel}:
  </p>
  <div style="text-align:center;margin:0 0 24px;">
    <span style="display:inline-block;background:#1e1a20;border:1px solid rgba(194,44,44,0.3);border-radius:8px;padding:16px 32px;font-family:monospace;font-size:28px;font-weight:700;letter-spacing:8px;color:#f5f1ec;">${code}</span>
  </div>
  <p style="margin:0 0 8px;font-size:13px;color:rgba(140,133,128,0.7);">This code expires in <strong style="color:#f5f1ec;">${ttlMinutes} minutes</strong> and can only be used once.</p>
  <p style="margin:0;font-size:12px;color:rgba(140,133,128,0.5);">If you didn't request this change, you can safely ignore this email.</p>`
}

export async function sendOtpEmail(
  toEmail: string,
  otp: string,
  changeType: SensitiveChangeType
): Promise<void> {
  const ttlMins = Math.round(OTP_TTL_MS / 60_000)
  const subjects: Record<SensitiveChangeType, string> = {
    CHANGE_EMAIL_VERIFY_OLD: 'Verify your identity — email change request',
    CHANGE_EMAIL_VERIFY_NEW: 'Confirm your new email address — RePIXL',
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
  const html = emailWrapper(
    subjects[changeType],
    otpBlock(otp, purposes[changeType], ttlMins)
  )
  const text = `Your RePIXL verification code: ${otp}\n\nThis code expires in ${ttlMins} minutes.\n\nIf you didn't request this, ignore this email.`
  await sendNotificationEmail(toEmail, subjects[changeType], text, { html })
}

export async function sendSecurityNotification(
  toEmail: string,
  event: string
): Promise<void> {
  const html = emailWrapper(
    `Security alert: ${event}`,
    `<p style="margin:0;font-size:14px;color:#8c8580;line-height:1.6;">
      Your <strong style="color:#f5f1ec;">RePIXL account</strong> ${event}.
      If you did not make this change, contact support immediately.
    </p>`
  )
  await sendNotificationEmail(
    toEmail,
    `RePIXL security: ${event}`,
    `Your RePIXL account ${event}. If you did not make this change, contact support immediately.`,
    { html }
  )
}
