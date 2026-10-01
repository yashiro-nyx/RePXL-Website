import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  MESSAGES,
  codeFromStatus,
  messageFromStatus,
  looksTechnical,
} from './messages'
import { humanizeZodIssue, zodToSafeBody } from './api-errors'
import { toUserMessage, messageFromApiBody, getFieldErrors, toUserMessageFromResponse } from './client-errors'

// The exact schema shape that produced the reported raw-JSON leak.
const returnSchema = z.object({
  details: z.string().min(10, 'Please describe the issue in at least 10 characters.').optional().default(''),
  email: z.string().email(),
  reason: z.enum(['DAMAGED', 'WRONG_ITEM']),
})

describe('looksTechnical — blocks raw/technical strings from the UI', () => {
  it('flags raw Zod JSON, Prisma, SQL, stack traces, status text', () => {
    expect(looksTechnical('[{"code":"too_small","minimum":10,"path":["details"]}]')).toBe(true)
    expect(looksTechnical('Validation error: [{ "code": "too_small" }]')).toBe(true)
    expect(looksTechnical('PrismaClientKnownRequestError P2025')).toBe(true)
    expect(looksTechnical('ECONNREFUSED 127.0.0.1:5432')).toBe(true)
    expect(looksTechnical('TypeError: cannot read property of undefined')).toBe(true)
    expect(looksTechnical('Internal server error')).toBe(true)
    expect(looksTechnical('Failed to fetch')).toBe(true)
    expect(looksTechnical('')).toBe(true)
  })
  it('allows genuine customer-safe messages', () => {
    expect(looksTechnical('Please describe the issue in at least 10 characters.')).toBe(false)
    expect(looksTechnical('Your card was declined.')).toBe(false)
    expect(looksTechnical('This item is no longer available.')).toBe(false)
  })
})

describe('HTTP status → safe message', () => {
  it('maps common statuses to stable codes + approved copy', () => {
    expect(codeFromStatus(401)).toBe('UNAUTHENTICATED')
    expect(codeFromStatus(403)).toBe('FORBIDDEN')
    expect(codeFromStatus(404)).toBe('NOT_FOUND')
    expect(codeFromStatus(409)).toBe('CONFLICT')
    expect(codeFromStatus(422)).toBe('VALIDATION')
    expect(codeFromStatus(429)).toBe('RATE_LIMITED')
    expect(codeFromStatus(500)).toBe('SERVER')
    expect(codeFromStatus(503)).toBe('SERVICE_UNAVAILABLE')
    expect(messageFromStatus(401)).toBe(MESSAGES.UNAUTHENTICATED)
    expect(messageFromStatus(500)).toBe(MESSAGES.SERVER)
  })
})

describe('humanizeZodIssue / zodToSafeBody — no metadata leaks', () => {
  it('keeps a human schema message and drops technical metadata', () => {
    const err = returnSchema.safeParse({ details: 'too short', email: 'x@y.com', reason: 'DAMAGED' })
    expect(err.success).toBe(false)
    if (err.success) return
    const body = zodToSafeBody(err.error)
    expect(body.code).toBe('VALIDATION')
    expect(body.fieldErrors?.details).toBe('Please describe the issue in at least 10 characters.')
    // The top-level message is the first field message — never "Validation failed" jargon or JSON.
    expect(body.error).toBe('Please describe the issue in at least 10 characters.')
    const serialized = JSON.stringify(body)
    expect(serialized).not.toContain('too_small')
    expect(serialized).not.toContain('minimum')
    expect(serialized).not.toContain('"path"')
  })

  it('synthesizes friendly copy for generic Zod defaults (email/required)', () => {
    const err = returnSchema.safeParse({ details: 'a valid long description', email: 'not-an-email', reason: 'DAMAGED' })
    if (err.success) throw new Error('expected failure')
    const body = zodToSafeBody(err.error)
    expect(body.fieldErrors?.email).toBe('Enter a valid email address.')
  })

  it('required field (missing) → "This field is required."', () => {
    const s = z.object({ address: z.string().min(1) })
    const err = s.safeParse({})
    if (err.success) throw new Error('expected failure')
    const body = zodToSafeBody(err.error)
    expect(body.fieldErrors?.address).toBe('This field is required.')
  })

  it('humanizes min-length string issues without exposing numbers as jargon', () => {
    const s = z.object({ password: z.string().min(8) })
    const err = s.safeParse({ password: 'short' })
    if (err.success) throw new Error('expected failure')
    const msg = humanizeZodIssue(err.error.issues[0])
    expect(msg).toBe('Please enter at least 8 characters.')
    expect(msg).not.toContain('String must contain')
  })
})

describe('client mapper — never surfaces technical text', () => {
  it('messageFromApiBody prefers safe server message, else status fallback', () => {
    expect(messageFromApiBody({ error: 'Your card was declined.' }, 400)).toBe('Your card was declined.')
    // Technical server error → replaced by the status fallback.
    expect(messageFromApiBody({ error: 'PrismaClientKnownRequestError' }, 500)).toBe(MESSAGES.SERVER)
    expect(messageFromApiBody(null, 401)).toBe(MESSAGES.UNAUTHENTICATED)
  })

  it('toUserMessage maps network/technical throws to safe copy', () => {
    expect(toUserMessage(new TypeError('Failed to fetch'))).toBe(MESSAGES.NETWORK)
    expect(toUserMessage(new Error('ZodError: ...'))).toBe(MESSAGES.UNKNOWN)
    expect(toUserMessage(new Error('Your session has expired. Please sign in again.'))).toBe(
      'Your session has expired. Please sign in again.'
    )
  })

  it('getFieldErrors returns only safe per-field messages', () => {
    const fe = getFieldErrors({ fieldErrors: { details: 'Please add more detail.', bad: '[{"code":"x"}]' } })
    expect(fe.details).toBe('Please add more detail.')
    expect(fe.bad).toBeUndefined()
  })

  it('toUserMessageFromResponse returns "" on ok and safe copy on failure', () => {
    expect(toUserMessageFromResponse({ ok: true, status: 200 }, null)).toBe('')
    expect(toUserMessageFromResponse({ ok: false, status: 422 }, { error: 'Please add more detail.' })).toBe('Please add more detail.')
    expect(toUserMessageFromResponse({ ok: false, status: 500 }, { error: 'Internal server error' })).toBe(MESSAGES.SERVER)
  })
})

describe('regression: the reported Return/Refund leak never reaches the UI', () => {
  it('the raw screenshot string is classified technical and replaced', () => {
    const raw =
      'Validation error: [{ "code": "too_small", "minimum": 10, "type": "string", "inclusive": true, "exact": false, "message": "Details must be at least 10 characters", "path": ["details"] }]'
    expect(looksTechnical(raw)).toBe(true)
    expect(messageFromApiBody({ error: raw }, 422)).toBe(MESSAGES.VALIDATION)
  })
})
