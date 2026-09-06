/**
 * Pure OTP utilities for sensitive profile change flows.
 * No I/O — safe to import in tests without a database connection.
 */

import { randomInt } from 'crypto'
import { createHash } from 'crypto'

export const OTP_DIGITS           = 6
export const OTP_TTL_MS           = 8 * 60 * 1000   // 8 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000     // 60 s
export const OTP_MAX_ATTEMPTS     = 5

/** Generate a random 6-digit OTP string. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_DIGITS, '0')
}

/** SHA-256 hash a code for safe storage. */
export function hashOtp(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}
