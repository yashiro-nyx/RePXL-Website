/**
 * Client-side error translation for React/UI components.
 *
 * `toUserMessage` turns any failure — a fetch Response, a parsed API body, a
 * thrown Error, or a network failure — into a safe, human-readable string. It
 * only shows a server-provided message when that message is clearly customer-
 * safe (via `looksTechnical`); otherwise it falls back to the canonical message
 * for the HTTP status/category. It NEVER renders raw Zod/Prisma/stack text.
 *
 * `getFieldErrors` extracts the safe per-field messages the API contract
 * provides (`fieldErrors`) for field-level display.
 */

import {
  MESSAGES,
  messageFromStatus,
  codeFromStatus,
  looksTechnical,
  type ErrorCode,
} from './messages'

export type { ErrorCode }

/** Shape of the safe API error body (mirrors src/lib/errors/api-errors.ts). */
export interface ApiErrorBody {
  success?: boolean
  code?: ErrorCode | string
  error?: string
  message?: string
  fieldErrors?: Record<string, string>
}

/**
 * Resolve a customer-safe message from a parsed API body + HTTP status.
 * Prefers the API's `error`/`message` ONLY when it doesn't look technical.
 */
export function messageFromApiBody(body: ApiErrorBody | null | undefined, status: number): string {
  const provided = (body?.error ?? body?.message ?? '').toString()
  if (provided && !looksTechnical(provided)) return provided
  return messageFromStatus(status)
}

/** Per-field messages from a safe API body ({} when none). */
export function getFieldErrors(body: ApiErrorBody | null | undefined): Record<string, string> {
  const fe = body?.fieldErrors
  if (!fe || typeof fe !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(fe)) {
    if (typeof v === 'string' && v.trim() && !looksTechnical(v)) out[k] = v
  }
  return out
}

/**
 * Translate a fetch Response (already read into `body`) into a user message.
 * Use after `const body = await res.json().catch(() => null)`.
 */
export function toUserMessageFromResponse(res: { ok: boolean; status: number }, body: ApiErrorBody | null): string {
  if (res.ok) return ''
  return messageFromApiBody(body, res.status)
}

/**
 * Translate ANY caught client error (thrown Error, network failure, string)
 * into a safe message. Never returns raw technical text.
 */
export function toUserMessage(error: unknown, fallback: ErrorCode = 'UNKNOWN'): string {
  // Fetch/network failures throw TypeError("Failed to fetch") etc.
  if (error instanceof TypeError) return MESSAGES.NETWORK
  if (error instanceof Error) {
    return looksTechnical(error.message) ? MESSAGES[fallback] : error.message
  }
  if (typeof error === 'string') {
    return looksTechnical(error) ? MESSAGES[fallback] : error
  }
  return MESSAGES[fallback]
}

export { MESSAGES, messageFromStatus, codeFromStatus, looksTechnical }
