import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  authenticator,
  decryptSecret,
  encryptSecret,
  encryptionKey,
  recoveryCodes,
  recoveryHash,
  validStep,
} from './crypto'

const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
beforeEach(() => vi.stubEnv('MFA_ENCRYPTION_KEY', 'ab'.repeat(32)))
afterEach(() => vi.unstubAllEnvs())
describe('MFA cryptography', () => {
  it('matches the RFC 6238 SHA1 vector at 59 seconds (six digits)', () => {
    expect(authenticator(secret).generate({ timestamp: 59000 })).toBe('287082')
    expect(validStep(secret, '287082', -1, 59000)).toBe(1)
  })
  it('rejects wrong codes and replay', () => {
    expect(validStep(secret, 'wrong', -1, 59000)).toBeNull()
    expect(validStep(secret, '287082', 1, 59000)).toBeNull()
  })
  it('accepts only one step of skew', () => {
    const code = authenticator(secret).generate({ timestamp: 300000 })
    expect(validStep(secret, code, -1, 330000)).toBe(10)
    expect(validStep(secret, code, -1, 360000)).toBeNull()
  })
  it('encrypts with randomized authenticated ciphertext and binds to the user', () => {
    const encrypted = encryptSecret(secret, 'u1')
    expect(encrypted).not.toContain(secret)
    expect(encryptSecret(secret, 'u1')).not.toBe(encrypted)
    expect(decryptSecret(encrypted, 'u1')).toBe(secret)
    expect(() => decryptSecret(encrypted, 'u2')).toThrow()
    expect(() => decryptSecret(encrypted.slice(0, -4) + 'AAAA', 'u1')).toThrow()
  })
  it.each(['', 'invalid', 'ab'.repeat(31)])(
    'fails closed on invalid crypto configuration',
    (key) => {
      vi.stubEnv('MFA_ENCRYPTION_KEY', key)
      expect(encryptionKey).toThrow()
    }
  )
  it('generates distinct high-entropy recovery codes and normalized hashes', () => {
    const codes = recoveryCodes()
    expect(codes).toHaveLength(10)
    expect(new Set(codes).size).toBe(10)
    expect(codes[0].replace(/-/g, '')).toHaveLength(32)
    expect(recoveryHash(codes[0])).toBe(recoveryHash(codes[0].toUpperCase()))
    expect(recoveryHash(codes[0])).not.toContain(codes[0])
  })
})
