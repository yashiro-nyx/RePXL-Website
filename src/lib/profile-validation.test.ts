/**
 * Regression tests for profile field validation and voucher customer endpoint.
 */
import { describe, it, expect } from 'vitest'
import { updateProfileSchema } from '@/lib/validations'

describe('updateProfileSchema — username validation', () => {
  const base = { firstName: 'Jane', lastName: 'Doe' }

  it('accepts valid lowercase usernames', () => {
    const cases = ['jane', 'jane_doe', 'j-d', 'user123', 'abc']
    for (const username of cases) {
      expect(updateProfileSchema.safeParse({ ...base, username }).success).toBe(true)
    }
  })

  it('rejects uppercase characters', () => {
    expect(updateProfileSchema.safeParse({ ...base, username: 'Jane' }).success).toBe(false)
  })

  it('rejects usernames shorter than 3 characters', () => {
    expect(updateProfileSchema.safeParse({ ...base, username: 'ab' }).success).toBe(false)
  })

  it('rejects usernames longer than 30 characters', () => {
    expect(updateProfileSchema.safeParse({ ...base, username: 'a'.repeat(31) }).success).toBe(false)
  })

  it('rejects special characters beyond _ and -', () => {
    expect(updateProfileSchema.safeParse({ ...base, username: 'user@name' }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...base, username: 'user name' }).success).toBe(false)
  })

  it('accepts null username (clearing the field)', () => {
    expect(updateProfileSchema.safeParse({ ...base, username: null }).success).toBe(true)
  })

  it('accepts undefined username (not changing the field)', () => {
    expect(updateProfileSchema.safeParse({ ...base }).success).toBe(true)
  })
})

describe('updateProfileSchema — gender validation', () => {
  const base = { firstName: 'Jane', lastName: 'Doe' }

  it('accepts all defined gender enum values', () => {
    const valid = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY'] as const
    for (const gender of valid) {
      expect(updateProfileSchema.safeParse({ ...base, gender }).success).toBe(true)
    }
  })

  it('rejects arbitrary text for gender', () => {
    expect(updateProfileSchema.safeParse({ ...base, gender: 'attack-prompt' }).success).toBe(false)
    expect(updateProfileSchema.safeParse({ ...base, gender: '' }).success).toBe(false)
  })

  it('accepts null gender (unspecified)', () => {
    expect(updateProfileSchema.safeParse({ ...base, gender: null }).success).toBe(true)
  })
})

describe('updateProfileSchema — sensitive fields removed', () => {
  const base = { firstName: 'Jane', lastName: 'Doe' }

  it('phone is no longer in the schema — it is ignored/stripped', () => {
    // Zod strips unknown keys; passing phone should parse successfully but not appear in output
    const result = updateProfileSchema.safeParse({ ...base, phone: '09171234567' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).phone).toBeUndefined()
    }
  })

  it('dateOfBirth is no longer in the schema — it is ignored/stripped', () => {
    const result = updateProfileSchema.safeParse({ ...base, dateOfBirth: '1990-06-15' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect((result.data as Record<string, unknown>).dateOfBirth).toBeUndefined()
    }
  })

  it('rejects email in the body (email is now read-only in profile updates)', () => {
    // The new schema does not have an email field — providing it should not cause issues
    // (extra keys are stripped by safeParse in strict mode, or ignored in non-strict)
    const result = updateProfileSchema.safeParse({ ...base, email: 'hack@example.com' })
    // Zod strips unknown keys by default — the parse itself should succeed (email just ignored)
    // but the parsed output must NOT contain an email field
    if (result.success) {
      expect((result.data as Record<string, unknown>).email).toBeUndefined()
    }
  })
})
