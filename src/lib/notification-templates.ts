/**
 * Notification template logic (pure).
 *
 * Implements the token registry, placeholder resolution, unknown-token
 * detection, and template field validation described in the
 * admin-client-management-suite design (Components & Interfaces §5).
 *
 * This module contains only pure functions so it can be property-tested
 * independently of I/O. It does not import Prisma or any external service.
 */

/**
 * Notification event identifiers. These are kept string-literal aligned with
 * the `NotificationEvent` enum in the Prisma schema
 * (@prisma/client) so template code and persistence agree on the same set.
 */
export type NotificationEvent =
  | 'ORDER_CONFIRMATION'
  | 'ORDER_STATUS_CHANGE'
  | 'RETURN_RECEIVED'
  | 'RETURN_STATUS_CHANGE'
  | 'REFUND_COMPLETED'
  | 'PROMOTION'

/** All notification events, in schema order. */
export const NOTIFICATION_EVENTS: readonly NotificationEvent[] = [
  'ORDER_CONFIRMATION',
  'ORDER_STATUS_CHANGE',
  'RETURN_RECEIVED',
  'RETURN_STATUS_CHANGE',
  'REFUND_COMPLETED',
  'PROMOTION',
] as const

/**
 * Placeholder tokens allowed per event. Tokens are referenced in template
 * bodies/subjects using the `{{token}}` syntax (see {@link TOKEN_PATTERN}).
 * Any token used in a body that is not listed here for its event is treated
 * as unknown (Req 8.5).
 */
export const ALLOWED_TOKENS: Record<NotificationEvent, string[]> = {
  ORDER_CONFIRMATION: ['orderNumber', 'customerName', 'orderTotal', 'orderDate'],
  ORDER_STATUS_CHANGE: ['orderNumber', 'customerName', 'status'],
  RETURN_RECEIVED: ['orderNumber', 'customerName', 'returnId'],
  RETURN_STATUS_CHANGE: ['orderNumber', 'customerName', 'returnId', 'status'],
  REFUND_COMPLETED: ['orderNumber', 'customerName', 'refundAmount'],
  PROMOTION: ['customerName', 'promoTitle', 'promoCode'],
}

/**
 * Matches a placeholder token of the form `{{ tokenName }}`.
 * Token names are limited to letters, digits and underscore. Surrounding
 * whitespace inside the braces is tolerated and trimmed.
 */
const TOKEN_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g

/** Extract the ordered list of token names referenced in a string. */
function extractTokens(text: string): string[] {
  const tokens: string[] = []
  const regex = new RegExp(TOKEN_PATTERN)
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    tokens.push(match[1])
  }

  return tokens
}

/**
 * Replace each `{{token}}` occurrence in `body` with its value from `context`.
 *
 * Only tokens present as keys in `context` are replaced; unrecognized tokens
 * are left untouched so callers can detect them via {@link findUnknownTokens}.
 *
 * Req 8.4: defined placeholder tokens are replaced with the corresponding
 * order/customer value when composing a notification.
 */
export function resolvePlaceholders(
  body: string,
  context: Record<string, string>
): string {
  return body.replace(TOKEN_PATTERN, (whole, tokenName: string) => {
    if (Object.prototype.hasOwnProperty.call(context, tokenName)) {
      return context[tokenName]
    }
    return whole
  })
}

/**
 * Return the set of tokens used in `body` that are not defined for `event`.
 *
 * The result is de-duplicated and preserves first-seen order. An empty array
 * means every token used is valid for the event.
 *
 * Req 8.5: unknown tokens must be detected so the save can be rejected.
 */
export function findUnknownTokens(
  body: string,
  event: NotificationEvent
): string[] {
  const allowed = new Set(ALLOWED_TOKENS[event] ?? [])
  const unknown: string[] = []
  const seen = new Set<string>()
  for (const token of extractTokens(body)) {
    if (!allowed.has(token) && !seen.has(token)) {
      seen.add(token)
      unknown.push(token)
    }
  }
  return unknown
}

/** Field-length bounds for template validation (Req 8.2, 8.3). */
export const TEMPLATE_LIMITS = {
  subjectMin: 1,
  subjectMax: 200,
  bodyMin: 1,
  bodyMax: 10000,
} as const

export interface TemplateInput {
  subject: string
  body: string
}

export interface TemplateValidationError {
  field: 'subject' | 'body'
  message: string
}

export interface TemplateValidationResult {
  valid: boolean
  errors: TemplateValidationError[]
}

/**
 * Validate a notification template's editable fields.
 *
 * Req 8.2: accept when subject is 1–200 chars and body is 1–10,000 chars.
 * Req 8.3: otherwise reject and report each invalid field with its allowed
 * length. Length is measured on the raw string (bounds are 1..max inclusive).
 */
export function validateTemplate(input: TemplateInput): TemplateValidationResult {
  const errors: TemplateValidationError[] = []

  const subject = input.subject ?? ''
  const body = input.body ?? ''

  const subjectLen = subject.length
  if (subjectLen < TEMPLATE_LIMITS.subjectMin || subjectLen > TEMPLATE_LIMITS.subjectMax) {
    errors.push({
      field: 'subject',
      message: `Subject must be ${TEMPLATE_LIMITS.subjectMin} to ${TEMPLATE_LIMITS.subjectMax} characters.`,
    })
  }

  const bodyLen = body.length
  if (bodyLen < TEMPLATE_LIMITS.bodyMin || bodyLen > TEMPLATE_LIMITS.bodyMax) {
    errors.push({
      field: 'body',
      message: `Body must be ${TEMPLATE_LIMITS.bodyMin} to ${TEMPLATE_LIMITS.bodyMax} characters.`,
    })
  }

  return { valid: errors.length === 0, errors }
}
