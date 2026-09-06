/**
 * Masking utilities for sensitive profile display values.
 *
 * All functions are pure — no I/O. The masked values are safe to render in
 * HTML because they never include the full sensitive data. Do not rely on
 * CSS or client-side JS to hide the unmasked value; these functions should
 * be the only path to displaying these fields.
 */

/**
 * Mask an email address.
 * Reveals the first character and the full domain; obscures the rest of the
 * local part so the customer can recognise which account they are looking at.
 *
 * Examples:
 *   "alice@example.com"        → "a****@example.com"
 *   "ab@example.com"           → "a*@example.com"
 *   "a@example.com"            → "a@example.com"   (single char — nothing to mask)
 *   "" / null / no @           → "—"
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '—'
  const at = email.indexOf('@')
  if (at <= 0) return '—'
  const local  = email.slice(0, at)
  const domain = email.slice(at) // includes the @
  if (local.length <= 1) return email // nothing useful to mask
  return `${local[0]}${'*'.repeat(local.length - 1)}${domain}`
}

/**
 * Mask a Philippine mobile number.
 * Reveals the last 4 digits; obscures everything before them.
 *
 * Examples:
 *   "09171234567"  → "*******4567"
 *   "09171234"     → "****1234"    (short — still show last 4)
 *   ""             → "—"
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '—'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '—'
  const visible = digits.slice(-4)
  const hidden  = '*'.repeat(digits.length - 4)
  return `${hidden}${visible}`
}

/**
 * Mask a date-of-birth ISO string (YYYY-MM-DD).
 * Shows only the year; hides month and day.
 *
 * Examples:
 *   "2004-09-15"  → masked as year only (e.g. the month and day become hidden)
 *   null / ""     → "—"
 */
export function maskDob(dob: string | Date | null | undefined): string {
  if (!dob) return '—'
  const str = typeof dob === 'string' ? dob : dob.toISOString()
  const match = str.match(/^(\d{4})/)
  if (!match) return '—'
  return `**/**/${match[1]}`
}
