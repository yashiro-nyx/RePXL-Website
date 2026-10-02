/**
 * Server-side error → safe API response mapping.
 *
 * Converts internal failures (Zod validation, Prisma errors, unknown throws)
 * into a stable, customer-safe API contract:
 *
 *   { success: false, code: ErrorCode, error: <public message>, fieldErrors?: {...} }
 *
 * Raw Zod objects, validation metadata (path/minimum/code), Prisma error text,
 * SQL, stack traces, and unknown `error.message` values are NEVER placed in the
 * response. Detailed diagnostics stay in server logs (the caller logs them).
 */

import { NextResponse } from 'next/server'
import { ZodError, type ZodIssue } from 'zod'
import { MESSAGES, type ErrorCode } from './messages'

/** Per-field, customer-facing validation messages keyed by field name. */
export type FieldErrors = Record<string, string>

export interface SafeErrorBody {
  success: false
  code: ErrorCode
  error: string
  fieldErrors?: FieldErrors
  /**
   * Back-compat convenience: the same field messages as `"field: message"`
   * strings. Uses the HUMANIZED messages (never raw Zod metadata), so admin
   * tooling that reads `details` keeps working without leaking internals.
   */
  details?: string[]
}

/**
 * Turn a single Zod issue into a friendly, self-contained message. If the schema
 * author supplied a human message (not one of Zod's technical defaults), we keep
 * it; otherwise we synthesize plain guidance from the issue kind — WITHOUT
 * exposing codes, paths, or numeric metadata verbatim in a jargon-y way.
 */
export function humanizeZodIssue(issue: ZodIssue): string {
  const custom = issue.message?.trim()

  // Zod's built-in default messages are technical/awkward for customers.
  const looksDefault =
    !custom ||
    /^(Required|Invalid|Invalid input|Expected .* received|String must contain|Number must be|Array must contain|Invalid enum value|Invalid literal|Unrecognized key)/i.test(
      custom
    )

  if (!looksDefault) return custom

  switch (issue.code) {
    case 'too_small': {
      if (issue.type === 'string') {
        const min = typeof issue.minimum === 'number' ? issue.minimum : undefined
        if (min && min > 1) return `Please enter at least ${min} characters.`
        return 'This field is required.'
      }
      if (issue.type === 'array') {
        const min = typeof issue.minimum === 'number' ? issue.minimum : 1
        return `Please add at least ${min} item${min === 1 ? '' : 's'}.`
      }
      if (issue.type === 'number') return 'Please enter a larger value.'
      return 'Please enter a valid value.'
    }
    case 'too_big': {
      if (issue.type === 'string') {
        const max = typeof issue.maximum === 'number' ? issue.maximum : undefined
        return max ? `Please use ${max} characters or fewer.` : 'This value is too long.'
      }
      if (issue.type === 'array') {
        const max = typeof issue.maximum === 'number' ? issue.maximum : undefined
        return max ? `Please add no more than ${max} item${max === 1 ? '' : 's'}.` : 'Too many items.'
      }
      return 'Please enter a smaller value.'
    }
    case 'invalid_type':
      return issue.received === 'undefined' ? 'This field is required.' : 'Please enter a valid value.'
    case 'invalid_string': {
      const v = (issue as { validation?: unknown }).validation
      if (v === 'email') return 'Enter a valid email address.'
      if (v === 'url') return 'Enter a valid URL.'
      return 'Please enter a valid value.'
    }
    case 'invalid_enum_value':
      return 'Please choose one of the available options.'
    default:
      return 'Please enter a valid value.'
  }
}

/** Field name (top-level path segment) for grouping issues by field. */
function fieldNameOf(issue: ZodIssue): string {
  const seg = issue.path[0]
  return typeof seg === 'string' ? seg : typeof seg === 'number' ? String(seg) : '_form'
}

/**
 * Build a customer-safe body from a ZodError: a per-field map of friendly
 * messages plus a top-level message (the first field's message, or a generic
 * validation prompt). No paths/codes/metadata are exposed.
 */
export function zodToSafeBody(error: ZodError): SafeErrorBody {
  const fieldErrors: FieldErrors = {}
  for (const issue of error.issues) {
    const field = fieldNameOf(issue)
    // Keep the first (most relevant) message per field.
    if (!fieldErrors[field]) fieldErrors[field] = humanizeZodIssue(issue)
  }
  const entries = Object.entries(fieldErrors)
  const firstFieldMsg = entries[0]?.[1]
  return {
    success: false,
    code: 'VALIDATION',
    error: firstFieldMsg ?? MESSAGES.VALIDATION,
    fieldErrors: entries.length > 0 ? fieldErrors : undefined,
    details: entries.length > 0 ? entries.map(([field, msg]) => `${field}: ${msg}`) : undefined,
  }
}

/** JSON response (422) for a Zod validation failure. */
export function zodErrorResponse(error: ZodError) {
  return NextResponse.json(zodToSafeBody(error), { status: 422 })
}

/**
 * Map ANY caught error to a safe response. Zod → 422 field messages; everything
 * else (Prisma, DB, unknown throws) → a generic server/service message. The
 * real error is expected to be logged by the caller and is never returned.
 */
export function toSafeErrorResponse(error: unknown, fallback: ErrorCode = 'SERVER') {
  if (error instanceof ZodError) return zodErrorResponse(error)

  // Detect Prisma "record not found" (P2025) → 404 without leaking the code.
  const code = (error as { code?: string })?.code
  if (typeof code === 'string' && code === 'P2025') {
    return NextResponse.json<SafeErrorBody>(
      { success: false, code: 'NOT_FOUND', error: MESSAGES.NOT_FOUND },
      { status: 404 }
    )
  }

  const status = fallback === 'SERVICE_UNAVAILABLE' ? 503 : 500
  return NextResponse.json<SafeErrorBody>(
    { success: false, code: fallback, error: MESSAGES[fallback] },
    { status }
  )
}
