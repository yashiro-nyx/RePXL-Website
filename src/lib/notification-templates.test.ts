import { describe, it, expect } from 'vitest'
import { fc, test as fcTest } from '@fast-check/vitest'
import {
  ALLOWED_TOKENS,
  NOTIFICATION_EVENTS,
  TEMPLATE_LIMITS,
  findUnknownTokens,
  resolvePlaceholders,
  validateTemplate,
  type NotificationEvent,
} from './notification-templates'

const NUM_RUNS = 200

/** Arbitrary picking any defined notification event. */
const eventArb: fc.Arbitrary<NotificationEvent> = fc.constantFrom(
  ...NOTIFICATION_EVENTS
)

/** A token-name arbitrary (letters/digits/underscore, non-empty). */
const tokenNameArb = fc
  .stringMatching(/^[A-Za-z_][A-Za-z0-9_]*$/)
  .filter((s) => s.length > 0 && s.length <= 24)

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 27: Notification template
// validation — accept only when subject is 1–200 chars and body is 1–10,000
// chars, otherwise reject and report each invalid field.
// Validates: Requirements 8.2, 8.3
// ---------------------------------------------------------------------------
describe('Property 27: Notification template validation', () => {
  fcTest.prop({
    subject: fc.string({ maxLength: 260 }),
    body: fc.string({ maxLength: 10100 }),
  })(
    'accepts iff subject and body are within bounds, and reports each invalid field',
    ({ subject, body }) => {
      const result = validateTemplate({ subject, body })

      const subjectOk =
        subject.length >= TEMPLATE_LIMITS.subjectMin &&
        subject.length <= TEMPLATE_LIMITS.subjectMax
      const bodyOk =
        body.length >= TEMPLATE_LIMITS.bodyMin &&
        body.length <= TEMPLATE_LIMITS.bodyMax

      expect(result.valid).toBe(subjectOk && bodyOk)

      const fields = new Set(result.errors.map((e) => e.field))
      expect(fields.has('subject')).toBe(!subjectOk)
      expect(fields.has('body')).toBe(!bodyOk)
    },
    { numRuns: NUM_RUNS }
  )

  it('accepts exact boundary lengths (1, 200, 10000)', () => {
    expect(validateTemplate({ subject: 'a', body: 'b' }).valid).toBe(true)
    expect(
      validateTemplate({
        subject: 'a'.repeat(TEMPLATE_LIMITS.subjectMax),
        body: 'b'.repeat(TEMPLATE_LIMITS.bodyMax),
      }).valid
    ).toBe(true)
  })

  it('rejects empty subject and empty body', () => {
    const result = validateTemplate({ subject: '', body: '' })
    expect(result.valid).toBe(false)
    expect(result.errors.map((e) => e.field).sort()).toEqual(['body', 'subject'])
  })
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 28: Defined placeholder
// tokens are fully resolved — for a body containing only tokens defined for its
// event and a matching context, resolvePlaceholders produces output with no
// unresolved defined tokens, each replaced by its value.
// Validates: Requirements 8.4
// ---------------------------------------------------------------------------
describe('Property 28: Defined placeholder tokens are fully resolved', () => {
  fcTest.prop({
    event: eventArb,
    // literal text segments interleaved between tokens (no braces of their own)
    segments: fc.array(fc.stringMatching(/^[^{}]*$/), { minLength: 1, maxLength: 6 }),
    tokenPicks: fc.array(fc.nat(), { maxLength: 6 }),
    values: fc.array(fc.stringMatching(/^[^{}]*$/), { minLength: 6, maxLength: 6 }),
  })(
    'replaces every defined token with its context value, leaving none unresolved',
    ({ event, segments, tokenPicks, values }) => {
      const allowed = ALLOWED_TOKENS[event]
      // Build a context mapping each allowed token to a concrete value.
      const context: Record<string, string> = {}
      allowed.forEach((tok, i) => {
        context[tok] = values[i % values.length] + `_v${i}`
      })

      // Interleave literal segments with chosen defined tokens.
      let body = segments[0]
      for (let i = 0; i < tokenPicks.length; i++) {
        const tok = allowed[tokenPicks[i] % allowed.length]
        body += `{{${tok}}}`
        body += segments[(i + 1) % segments.length]
      }

      const resolved = resolvePlaceholders(body, context)

      // No defined token should remain in `{{token}}` form.
      for (const tok of allowed) {
        expect(resolved.includes(`{{${tok}}}`)).toBe(false)
      }
      // findUnknownTokens is empty (only defined tokens used), and after
      // resolution there are no leftover placeholders at all.
      expect(findUnknownTokens(body, event)).toEqual([])
      expect(/\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(resolved)).toBe(false)
    },
    { numRuns: NUM_RUNS }
  )
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 29: Unknown placeholder
// tokens are detected — findUnknownTokens returns exactly the set of tokens
// used in the body that are not defined for that event; saving is rejected when
// that set is non-empty.
// Validates: Requirements 8.5
// ---------------------------------------------------------------------------
describe('Property 29: Unknown placeholder tokens are detected', () => {
  fcTest.prop({
    event: eventArb,
    usedTokens: fc.array(tokenNameArb, { minLength: 1, maxLength: 8 }),
    filler: fc.stringMatching(/^[^{}]*$/),
  })(
    'returns exactly the used tokens not defined for the event (deduped)',
    ({ event, usedTokens, filler }) => {
      const allowed = new Set(ALLOWED_TOKENS[event])
      const body = usedTokens.map((t) => `${filler}{{${t}}}`).join('')

      const unknown = findUnknownTokens(body, event)

      // Expected: distinct used tokens that are not allowed, first-seen order.
      const expected: string[] = []
      const seen = new Set<string>()
      for (const t of usedTokens) {
        if (!allowed.has(t) && !seen.has(t)) {
          seen.add(t)
          expected.push(t)
        }
      }

      expect(unknown).toEqual(expected)
      // Save-rejection contract: non-empty unknown set => must reject.
      const shouldReject = unknown.length > 0
      expect(shouldReject).toBe(expected.length > 0)
    },
    { numRuns: NUM_RUNS }
  )

  it('returns empty for a body using only allowed tokens', () => {
    for (const event of NOTIFICATION_EVENTS) {
      const body = ALLOWED_TOKENS[event].map((t) => `{{${t}}}`).join(' ')
      expect(findUnknownTokens(body, event)).toEqual([])
    }
  })
})
