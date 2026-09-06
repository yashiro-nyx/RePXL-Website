import { describe, it, expect } from 'vitest'
import { maskEmail, maskPhone, maskDob } from './mask'
import { generateOtp, hashOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from './sensitive-change-utils'
import { readFileSync } from 'node:fs'

// ── maskEmail ─────────────────────────────────────────────────────────────────

describe('maskEmail', () => {
  it('masks most of the local part, keeps first char and full domain', () => {
    expect(maskEmail('alice@example.com')).toBe('a****@example.com')
  })

  it('masks a longer local part', () => {
    expect(maskEmail('jervin@gmail.com')).toBe('j*****@gmail.com')
  })

  it('leaves a single-char local part unmasked', () => {
    expect(maskEmail('a@b.com')).toBe('a@b.com')
  })

  it('returns — for empty string', () => {
    expect(maskEmail('')).toBe('—')
  })

  it('returns — for null', () => {
    expect(maskEmail(null)).toBe('—')
  })

  it('returns — for undefined', () => {
    expect(maskEmail(undefined)).toBe('—')
  })

  it('returns — for a string without @', () => {
    expect(maskEmail('notanemail')).toBe('—')
  })

  it('never exposes the full local part', () => {
    const masked = maskEmail('secretuser@domain.com')
    expect(masked).not.toContain('secretuser')
    expect(masked.startsWith('s')).toBe(true)
    expect(masked.endsWith('@domain.com')).toBe(true)
  })
})

// ── maskPhone ─────────────────────────────────────────────────────────────────

describe('maskPhone', () => {
  it('shows only the last 4 digits', () => {
    expect(maskPhone('09171234567')).toBe('*******4567')
  })

  it('works for shorter numbers', () => {
    expect(maskPhone('09171234')).toBe('****1234')
  })

  it('returns — for empty string', () => {
    expect(maskPhone('')).toBe('—')
  })

  it('returns — for null', () => {
    expect(maskPhone(null)).toBe('—')
  })

  it('returns — for strings with fewer than 4 digits', () => {
    expect(maskPhone('123')).toBe('—')
  })

  it('strips non-digit characters before masking', () => {
    const masked = maskPhone('+63-917-123-4567')
    // 12 digits total → last 4 visible
    expect(masked.endsWith('4567')).toBe(true)
    expect(masked).not.toContain('917')
  })
})

// ── maskDob ───────────────────────────────────────────────────────────────────

describe('maskDob', () => {
  it('hides day and month, shows only year', () => {
    expect(maskDob('2004-09-15')).toBe('**/**/2004')
  })

  it('works for different years', () => {
    expect(maskDob('1990-01-01')).toBe('**/**/1990')
  })

  it('returns — for null', () => {
    expect(maskDob(null)).toBe('—')
  })

  it('returns — for empty string', () => {
    expect(maskDob('')).toBe('—')
  })

  it('accepts a Date object', () => {
    expect(maskDob(new Date('1985-06-20'))).toBe('**/**/1985')
  })

  it('never exposes the day or month', () => {
    const masked = maskDob('2004-09-15')
    expect(masked).not.toContain('09')
    expect(masked).not.toContain('15')
    expect(masked).toContain('2004')
  })
})

// ── Sensitive profile endpoint hardening ─────────────────────────────────────

describe('PUT /api/auth/me — whitelist enforcement', () => {
  it('updateProfileSchema does NOT include phone', () => {
    const src = readFileSync('src/lib/validations.ts', 'utf8')
    // The schema object must not accept phone as a field
    // (it was present before; absence is the guard)
    const schemaBlock = src.slice(
      src.indexOf('export const updateProfileSchema'),
      src.indexOf('// ─── Product Validations')
    )
    expect(schemaBlock).not.toContain('phone:')
  })

  it('updateProfileSchema does NOT include dateOfBirth', () => {
    const src = readFileSync('src/lib/validations.ts', 'utf8')
    const schemaBlock = src.slice(
      src.indexOf('export const updateProfileSchema'),
      src.indexOf('// ─── Product Validations')
    )
    expect(schemaBlock).not.toContain('dateOfBirth:')
  })

  it('PUT /api/auth/me route does NOT write phone or dateOfBirth', () => {
    const src = readFileSync('src/app/api/auth/me/route.ts', 'utf8')
    // The Prisma update `data:` object must not include phone or dateOfBirth
    // Extract just the data block to avoid false positives from the select clause
    const dataBlock = src.slice(src.indexOf('data: {'), src.indexOf('select: {'))
    expect(dataBlock).not.toContain('phone')
    expect(dataBlock).not.toContain('dateOfBirth')
    expect(src).toContain('SECURITY')
    expect(src).toContain('EXPLICIT whitelist')
  })

  it('sensitive change OTP routes exist for phone and DOB', () => {
    const phone = readFileSync('src/app/api/account/phone/route.ts', 'utf8')
    const dob   = readFileSync('src/app/api/account/dob/route.ts', 'utf8')
    expect(phone).toContain('CHANGE_PHONE')
    expect(dob).toContain('CHANGE_DOB')
  })

  it('sensitive route derives userId from session, never from body', () => {
    const src = readFileSync('src/app/api/account/sensitive/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    // Client must never supply a userId — it must never appear in body parsing
    expect(src).not.toContain('body.userId')
    expect(src).not.toContain('parsed.data.userId')
  })
})

// ── OTP utilities ─────────────────────────────────────────────────────────────

describe('sensitive-change OTP utilities', () => {
  it('generateOtp produces a 6-digit string', () => {
    expect(/^\d{6}$/.test(generateOtp())).toBe(true)
  })

  it('generates unique OTPs', () => {
    const codes = new Set(Array.from({ length: 20 }, generateOtp))
    expect(codes.size).toBeGreaterThan(15)
  })

  it('hashOtp produces a consistent 64-char hex string', () => {
    const h = hashOtp('123456')
    expect(/^[0-9a-f]{64}$/.test(h)).toBe(true)
    expect(hashOtp('123456')).toBe(h)
  })

  it('different codes produce different hashes', () => {
    expect(hashOtp('111111')).not.toBe(hashOtp('222222'))
  })

  it('OTP_TTL_MS is between 5 and 15 minutes', () => {
    expect(OTP_TTL_MS).toBeGreaterThanOrEqual(5 * 60 * 1000)
    expect(OTP_TTL_MS).toBeLessThanOrEqual(15 * 60 * 1000)
  })

  it('OTP_MAX_ATTEMPTS is between 3 and 10', () => {
    expect(OTP_MAX_ATTEMPTS).toBeGreaterThanOrEqual(3)
    expect(OTP_MAX_ATTEMPTS).toBeLessThanOrEqual(10)
  })
})

// ── Payments page ─────────────────────────────────────────────────────────────

describe('Payments page architecture', () => {
  it('payments page exists in account routes', () => {
    const src = readFileSync('src/app/(storefront)/account/payments/page.tsx', 'utf8')
    expect(src).toContain('PaymentsPanel')
  })

  it('payments appears in account navigation', () => {
    const src = readFileSync('src/lib/account-navigation.ts', 'utf8')
    expect(src).toContain('/account/payments')
    expect(src).toContain('Payments')
  })

  it('PaymentsPanel correctly describes no saved-card storage', () => {
    const src = readFileSync('src/components/account/PaymentsPanel.tsx', 'utf8')
    expect(src).toContain('No saved payment methods')
    // Must NOT claim cards are saved for future purchases
    expect(src).not.toContain('saved for future purchases')
  })

  it('paymentStore never stores real card credentials', () => {
    const src = readFileSync('src/stores/paymentStore.ts', 'utf8')
    // All mutation methods throw
    expect(src).toContain('unavailable')
    expect(src).toContain('cards: []')
    // Must not contain PAN/CVV storage
    expect(src).not.toContain('cardNumber')
    expect(src).not.toContain('cvv')
    expect(src).not.toContain('pan')
  })
})

// ── Account loader centering ──────────────────────────────────────────────────

describe('AccountShell loader centering', () => {
  it('auth-gate loader is in a flex centering container, not a bare div with pt-32', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    // Old pattern was: min-h-screen px-6 pt-32 with FilmStripLoader at top
    expect(src).not.toContain('pt-32')
    // New pattern uses flex + items-center + justify-center
    expect(src).toContain('items-center justify-center')
    expect(src).toContain('FilmStripLoader')
  })

  it('loader container uses min-h to actually enable vertical centering', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(src).toContain('min-h-[calc(')
  })
})
