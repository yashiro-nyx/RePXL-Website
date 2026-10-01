import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural: the shared OtpInput is used across all 6-digit NUMERIC OTP flows,
// and recovery/mixed-code fields are intentionally left as plain text.

const read = (p: string) => readFileSync(p, 'utf8')
const otp = read('src/components/ui/OtpInput.tsx')
const mfaSettings = read('src/components/account/MfaSettings.tsx')
const securityGate = read('src/components/account/SecurityGate.tsx')
const loginMfa = read('src/app/(auth)/login/mfa/page.tsx')
const sensitive = read('src/components/account/SensitiveChangeModal.tsx')

describe('OtpInput component contract', () => {
  it('is accessible + numeric + autofill-friendly + paste-capable', () => {
    expect(otp).toContain("role=\"group\"")
    expect(otp).toContain('aria-label')
    expect(otp).toContain("inputMode=\"numeric\"")
    expect(otp).toContain("autoComplete={i === 0 ? 'one-time-code' : 'off'}")
    expect(otp).toContain('onPaste')
    expect(otp).toContain('aria-invalid')
    // Not type="number" (avoids spinner/format quirks).
    expect(otp).not.toContain('type="number"')
    // Backed by the tested pure logic.
    expect(otp).toContain("from '@/lib/otp-input-logic'")
  })
})

describe('shared OtpInput used in every 6-digit numeric flow', () => {
  it('MFA setup confirm uses OtpInput', () => {
    expect(mfaSettings).toContain('OtpInput')
    expect(mfaSettings).toContain("onComplete")
  })
  it('SecurityGate TOTP + email-code use OtpInput', () => {
    const count = (securityGate.match(/<OtpInput/g) ?? []).length
    expect(count).toBeGreaterThanOrEqual(2)
  })
  it('MFA login challenge uses OtpInput for the authenticator (numeric) mode', () => {
    expect(loginMfa).toContain('OtpInput')
    // Recovery mode stays a free-text input (not the 6-box component).
    expect(loginMfa).toContain('inputMode="text"')
  })
  it('SensitiveChangeModal email OTP uses OtpInput (both steps)', () => {
    const count = (sensitive.match(/<OtpInput/g) ?? []).length
    expect(count).toBe(2)
  })
})

describe('recovery / mixed codes are NOT forced into the 6-box component', () => {
  it('MfaSettings manage step keeps a text field (authenticator OR recovery code)', () => {
    // The manage/disable/regenerate code field accepts recovery codes too.
    expect(mfaSettings).toContain('maxLength={128}')
  })
})
