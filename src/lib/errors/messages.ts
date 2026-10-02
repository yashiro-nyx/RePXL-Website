/**
 * Canonical customer-facing messages for RePXL.
 *
 * These are the ONLY strings a customer should ever see for the corresponding
 * failure categories. They answer at least one of: what happened / what to do
 * next / which action needs attention — and never leak Zod objects, JSON,
 * validation paths, HTTP status codes, Prisma/SQL errors, stack traces, or
 * internal names.
 *
 * Framework-free so it can be imported on both the server (API routes) and the
 * client (React components) and unit-tested without a DOM.
 */

/** Stable, machine-readable error codes (for logs, tests, and API contracts). */
export type ErrorCode =
  | 'VALIDATION'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'SERVER'
  | 'SERVICE_UNAVAILABLE'
  | 'NETWORK'
  | 'UNKNOWN'

/** Approved public message for each category. */
export const MESSAGES: Record<ErrorCode, string> = {
  VALIDATION: 'Please check the highlighted fields and try again.',
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "We couldn't find what you're looking for.",
  CONFLICT: 'This action conflicts with the current state. Please refresh and try again.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  SERVER: 'Something went wrong on our side. Please try again in a moment.',
  SERVICE_UNAVAILABLE: "We're having trouble loading this information right now. Please try again shortly.",
  NETWORK: 'We couldn’t reach RePXL. Check your connection and try again.',
  UNKNOWN: 'Something went wrong. Please try again.',
}

/** Map an HTTP status code to a stable error code. */
export function codeFromStatus(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 422) return 'VALIDATION'
  if (status === 429) return 'RATE_LIMITED'
  if (status === 503) return 'SERVICE_UNAVAILABLE'
  if (status >= 500) return 'SERVER'
  if (status >= 400) return 'VALIDATION'
  return 'UNKNOWN'
}

/** The approved public message for an HTTP status. */
export function messageFromStatus(status: number): string {
  return MESSAGES[codeFromStatus(status)]
}

/**
 * Heuristic guard: does a string look like a raw/technical/internal message that
 * must NEVER be shown to a customer? Used to decide whether an API-provided
 * `error` string is safe to display or should be replaced with a canonical one.
 */
const TECHNICAL_SIGNATURES = [
  'zoderror',
  'prisma',
  'prismaclient',
  'p20', // Prisma error codes P2002/P2025/etc.
  'postgres',
  'postgresql',
  'supabase',
  'econnrefused',
  'ecconn',
  'sqlstate',
  'stack trace',
  'at Object.',
  'at async',
  'undefined is not',
  'cannot read propert',
  'typeerror',
  'referenceerror',
  'too_small',
  'too_big',
  'invalid_type',
  'unrecognized_keys',
  '"path"',
  '"code":',
  'validation error: [',
  'internal server error',
  'failed to fetch',
  'networkerror',
]

export function looksTechnical(message: string): boolean {
  const m = message.trim().toLowerCase()
  if (m.length === 0) return true
  // Raw JSON payloads (arrays/objects) are never safe to show.
  if (m.startsWith('{') || m.startsWith('[')) return true
  return TECHNICAL_SIGNATURES.some((sig) => m.includes(sig))
}
