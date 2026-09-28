/**
 * In-app notification content, formatting, and display model (pure).
 *
 * ─── Why this module exists ──────────────────────────────────────────────────
 * Historically the in-app inbox stored the *email* template body verbatim: a
 * long, multi-paragraph string full of `{{token}}` placeholders. When a caller
 * did not supply a complete `context`, `resolvePlaceholders` left those tokens
 * untouched (by design, so the admin editor can flag them), and the raw
 * `#{{orderNumber}}`, `{{status}}`, `{{refundAmount}}`, embedded URLs, etc. were
 * written straight into `Notification.message` and shown to the customer.
 *
 * This module is the single source of truth for what an in-app notification
 * *looks like*. It produces a concise, human-readable `{ title, body, href }`
 * from validated context — it NEVER emits an unresolved `{{token}}`, raw JSON,
 * or `[object Object]`. Email keeps using the rich templates unchanged.
 *
 * It is intentionally pure (no Prisma / React / Next imports) so it can be unit-
 * tested in the node environment and reused by the API layer and both UIs.
 */

import type { NotificationEvent } from './notification-templates'
import { EVENT_CATEGORY_MAP } from './notification-templates'

// ─── Display categories ──────────────────────────────────────────────────────
// The persistence taxonomy is coarse (ORDER_UPDATES / PROMOTIONS / REPIXL_UPDATES).
// For the UI we derive a finer, honest display category from the event (and, for
// order status changes, from the status text) — never from invented data.

export type NotificationDisplayCategory =
  | 'ORDERS'
  | 'PAYMENTS'
  | 'SHIPPING'
  | 'RETURNS'
  | 'ACCOUNT'
  | 'PROMOTIONS'
  | 'UPDATES'

export interface DisplayCategoryMeta {
  /** Stable key used in URLs / filters. */
  key: NotificationDisplayCategory
  /** Short human label. */
  label: string
  /** Icon identifier (components map this to an SVG). */
  icon: NotificationIcon
  /** Tailwind text-color token for the icon/accent (theme-aware repixl tokens). */
  accentClass: string
}

export type NotificationIcon =
  | 'order'
  | 'payment'
  | 'shipping'
  | 'return'
  | 'security'
  | 'promotion'
  | 'update'

/**
 * Metadata for each display category. Icons are referenced by name; the React
 * components own the actual SVG paths so this module stays framework-free.
 */
export const DISPLAY_CATEGORY_META: Record<NotificationDisplayCategory, DisplayCategoryMeta> = {
  ORDERS:     { key: 'ORDERS',     label: 'Orders',           icon: 'order',     accentClass: 'text-repixl-text-light' },
  PAYMENTS:   { key: 'PAYMENTS',   label: 'Payments',         icon: 'payment',   accentClass: 'text-repixl-success' },
  SHIPPING:   { key: 'SHIPPING',   label: 'Shipping',         icon: 'shipping',  accentClass: 'text-repixl-text-light' },
  RETURNS:    { key: 'RETURNS',    label: 'Returns',          icon: 'return',    accentClass: 'text-repixl-warning' },
  ACCOUNT:    { key: 'ACCOUNT',    label: 'Account & Security', icon: 'security', accentClass: 'text-repixl-red' },
  PROMOTIONS: { key: 'PROMOTIONS', label: 'Promotions',       icon: 'promotion', accentClass: 'text-repixl-red' },
  UPDATES:    { key: 'UPDATES',    label: 'Updates',          icon: 'update',    accentClass: 'text-repixl-muted' },
}

/** Order in which category filter tabs are presented. "All" is added by the UI. */
export const DISPLAY_CATEGORY_ORDER: NotificationDisplayCategory[] = [
  'ORDERS',
  'PAYMENTS',
  'SHIPPING',
  'RETURNS',
  'ACCOUNT',
  'PROMOTIONS',
  'UPDATES',
]

/**
 * Derive the display category from the event and (optionally) a status string.
 * This only uses information the notification actually carries.
 */
export function displayCategoryFor(
  event: NotificationEvent | string,
  status?: string | null
): NotificationDisplayCategory {
  switch (event) {
    case 'ORDER_CONFIRMATION':
      return 'ORDERS'
    case 'ORDER_STATUS_CHANGE': {
      const s = (status ?? '').toUpperCase()
      // A shipped/in-transit/delivered status is a shipping update; everything
      // else (confirmed, processing, cancelled, completed) reads as an order update.
      if (/SHIP|TRANSIT|DELIVER|OUT FOR|COURIER|DISPATCH/.test(s)) return 'SHIPPING'
      return 'ORDERS'
    }
    case 'RETURN_RECEIVED':
    case 'RETURN_STATUS_CHANGE':
      return 'RETURNS'
    case 'REFUND_COMPLETED':
      return 'PAYMENTS'
    case 'PROMOTION':
      return 'PROMOTIONS'
    case 'REPIXL_UPDATE':
      return 'UPDATES'
    default:
      return 'UPDATES'
  }
}

// ─── Message envelope (stored in Notification.message) ───────────────────────
// We cannot add columns without a migration, so a compact, self-describing
// envelope is stored in the existing `message` string. It carries the concise
// title, body, and (optional) destination href. Older rows that are plain text
// are handled by parseInAppMessage's legacy branch.

/** Envelope version marker. Bump if the shape changes. */
export const INAPP_ENVELOPE_PREFIX = 'RPXN1:'

export interface InAppContent {
  /** Short, bolded headline. e.g. "Order Shipped". */
  title: string
  /** One or two concise sentences of supporting text. */
  body: string
  /** Optional in-app destination path (validated internal route) or null. */
  href: string | null
}

/**
 * Serialize concise in-app content into the storage envelope. The result is a
 * single line so it survives existing `truncateForDisplay` bounds comfortably
 * (concise content is well under the 500-char cap).
 */
export function serializeInAppContent(content: InAppContent): string {
  const safe: InAppContent = {
    title: content.title.trim(),
    body: content.body.trim(),
    href: content.href && isInternalHref(content.href) ? content.href : null,
  }
  return INAPP_ENVELOPE_PREFIX + JSON.stringify(safe)
}

/**
 * Parse a stored `Notification.message` into display content.
 *
 * Three cases, in order:
 *  1. A well-formed envelope → parsed content (with a final sanitize pass).
 *  2. Legacy / admin plain text → treated as body; a title is derived from the
 *     event; any malformed fragments are sanitized (see sanitizeInAppMessage).
 *  3. Anything unparseable → a safe, generic fallback for the event.
 */
export function parseInAppMessage(
  raw: string | null | undefined,
  event: NotificationEvent | string
): InAppContent {
  const fallbackTitle = defaultTitleFor(event)

  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return { title: fallbackTitle, body: defaultBodyFor(event), href: null }
  }

  if (raw.startsWith(INAPP_ENVELOPE_PREFIX)) {
    try {
      const parsed = JSON.parse(raw.slice(INAPP_ENVELOPE_PREFIX.length)) as Partial<InAppContent>
      const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : fallbackTitle
      const body = typeof parsed.body === 'string' ? sanitizeInAppMessage(parsed.body, event) : defaultBodyFor(event)
      const href = typeof parsed.href === 'string' && isInternalHref(parsed.href) ? parsed.href : null
      return { title, body, href }
    } catch {
      // Corrupt envelope — fall through to the legacy/plain path below.
    }
  }

  // Legacy plain-text row (pre-redesign) or admin free text.
  const body = sanitizeInAppMessage(raw, event)
  return { title: fallbackTitle, body, href: legacyHrefFromText(raw, event) }
}

// ─── Legacy content sanitization (display-time, non-destructive) ─────────────

/**
 * Detects whether a string still contains raw, code-like content that must
 * never be shown to a customer: unresolved `{{tokens}}` or `${...}`, JSON-object
 * fragments, or the literal `[object Object]`.
 *
 * This is deliberately conservative — it recognizes the specific shapes the old
 * pipeline produced, rather than stripping every brace (which could damage
 * legitimate text). It is used only to decide whether to fall back to safe copy.
 */
export function looksMalformed(text: string): boolean {
  if (!text) return false
  if (text.includes('[object Object]')) return true
  // Unresolved handlebars token: {{ something }}
  if (/\{\{\s*[A-Za-z0-9_]+\s*\}\}/.test(text)) return true
  // Unresolved JS template expression: ${ something }
  if (/\$\{[^}]*\}/.test(text)) return true
  // A serialized JSON object/array fragment, e.g. {"status":"delivered"}
  if (/[{[]\s*"[^"]+"\s*:/.test(text)) return true
  return false
}

/**
 * Safe display strategy for legacy / free-text notification bodies.
 *
 * - If the text is clean, it is returned trimmed (and unwrapped from the email
 *   preamble if present) so existing good notifications are unchanged.
 * - If the text still contains raw tokens / JSON / `[object Object]`, we do NOT
 *   try to surgically repair it (that would risk hiding or corrupting content);
 *   instead we return a safe, generic message appropriate to the event.
 *
 * This never mutates the database — it is applied at read time only.
 */
export function sanitizeInAppMessage(
  raw: string,
  event: NotificationEvent | string
): string {
  const text = (raw ?? '').trim()
  if (text.length === 0) return defaultBodyFor(event)

  if (looksMalformed(text)) {
    return defaultBodyFor(event)
  }

  // Clean legacy text: collapse the long email-style body to its first
  // meaningful line(s) so the inbox stays scannable. We drop a leading
  // "Hi <name>," greeting and keep the first substantive sentence/paragraph.
  const withoutGreeting = text.replace(/^hi[^,\n]*,\s*/i, '').trim()
  const firstParagraph = withoutGreeting.split(/\n\n+/)[0]?.trim() || withoutGreeting
  // Strip any inline URLs (they belong on the destination, not the preview).
  const withoutUrls = firstParagraph.replace(/https?:\/\/\S+/g, '').replace(/\s{2,}/g, ' ').trim()
  return withoutUrls.length > 0 ? withoutUrls : defaultBodyFor(event)
}

// ─── Internal-route helpers ──────────────────────────────────────────────────

/** True for same-origin absolute paths only (rejects external/protocol-relative). */
export function isInternalHref(value: string | null | undefined): value is string {
  if (typeof value !== 'string') return false
  const v = value.trim()
  if (v.length === 0) return false
  if (!v.startsWith('/')) return false
  if (v.startsWith('//')) return false
  if (v.includes('\\')) return false
  return true
}

/** RePXL order-number format used across the app (e.g. RPX-MTR9028). */
const ORDER_NUMBER_RE = /\b(RPX-[A-Z0-9]{4,})\b/

/** Best-effort destination for a legacy plain-text row (order link if present). */
function legacyHrefFromText(text: string, event: NotificationEvent | string): string | null {
  const category = EVENT_CATEGORY_MAP[event as NotificationEvent]
  if (category === 'PROMOTIONS') return '/products'
  if (category === 'REPIXL_UPDATES') return null
  const m = text.match(ORDER_NUMBER_RE)
  if (m) return `/account/orders/${m[1]}`
  return null
}

// ─── Default (fallback) copy per event ───────────────────────────────────────

/** Short headline used when no better title is available. */
export function defaultTitleFor(event: NotificationEvent | string): string {
  switch (event) {
    case 'ORDER_CONFIRMATION':   return 'Order Confirmed'
    case 'ORDER_STATUS_CHANGE':  return 'Order Update'
    case 'RETURN_RECEIVED':      return 'Return Request Received'
    case 'RETURN_STATUS_CHANGE': return 'Return Update'
    case 'REFUND_COMPLETED':     return 'Refund Processed'
    case 'PROMOTION':            return 'New Offer'
    case 'REPIXL_UPDATE':        return 'RePXL Update'
    default:                     return 'Notification'
  }
}

/** Safe, generic body used when the real content is missing or malformed. */
export function defaultBodyFor(event: NotificationEvent | string): string {
  switch (event) {
    case 'ORDER_CONFIRMATION':   return 'Your order has been confirmed. Open your order for the details.'
    case 'ORDER_STATUS_CHANGE':  return 'There is an update on your order. Open it to see the latest status.'
    case 'RETURN_RECEIVED':      return 'We received your return request and our team is reviewing it.'
    case 'RETURN_STATUS_CHANGE': return 'There is an update on your return request.'
    case 'REFUND_COMPLETED':     return 'Your refund has been processed. Open the order for details.'
    case 'PROMOTION':            return 'A new offer is available. Browse the collection to learn more.'
    case 'REPIXL_UPDATE':        return 'There is a new update from RePXL.'
    default:                     return 'You have a new notification.'
  }
}

// ─── The concise in-app content builder (the heart of the fix) ───────────────

export interface BuildInAppInput {
  event: NotificationEvent
  /** Validated context values supplied by the emitting call site. */
  context?: Record<string, string | null | undefined>
  /** Order number, if the caller has it directly (drives the destination). */
  orderNumber?: string | null
  /**
   * A plain-text body the caller already wrote (e.g. broadcast free text or a
   * transactional fallback). Used for PROMOTION / REPIXL_UPDATE and as a last
   * resort. It is sanitized before use.
   */
  fallbackBody?: string | null
  /** A plain-text subject/title the caller wrote. Sanitized before use. */
  fallbackTitle?: string | null
}

function clean(value: string | null | undefined): string {
  const v = (value ?? '').trim()
  return looksMalformed(v) ? '' : v
}

/** Humanize a raw status token like "OUT_FOR_DELIVERY" → "Out for delivery". */
export function humanizeStatus(status: string | null | undefined): string {
  const s = clean(status)
  if (!s) return ''
  const spaced = s.replace(/[_-]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

/**
 * Build concise, human-readable in-app content for an event from validated
 * context. Guarantees:
 *   - never returns an unresolved `{{token}}`, `${expr}`, JSON, or `[object Object]`
 *   - title is short; body is one or two sentences
 *   - href is a valid internal route or null (never the homepage as a catch-all
 *     for order/return events)
 */
export function buildInAppNotification(input: BuildInAppInput): InAppContent {
  const ctx = input.context ?? {}
  const orderNumber = clean(input.orderNumber) || clean(ctx.orderNumber)
  const orderRef = orderNumber ? `#${orderNumber}` : 'your order'
  const orderHref = orderNumber ? `/account/orders/${orderNumber}` : null

  switch (input.event) {
    case 'ORDER_CONFIRMATION': {
      return {
        title: 'Order Confirmed',
        body: `Your order ${orderRef} has been confirmed. We're preparing it for shipment.`,
        href: orderHref,
      }
    }

    case 'ORDER_STATUS_CHANGE': {
      const status = clean(ctx.status) || clean(ctx.orderStatus) || clean(ctx.deliveryStatus)
      const s = status.toUpperCase()
      const courier = clean(ctx.courierName)
      const tracking = clean(ctx.trackingNumber)

      // Tailor copy to the meaningful lifecycle states; fall back to a generic
      // "status updated" line for anything else — always human-readable.
      if (/DELIVER/.test(s)) {
        return { title: 'Order Delivered', body: `Your order ${orderRef} has been delivered.`, href: orderHref }
      }
      if (/SHIP|TRANSIT|OUT FOR|DISPATCH|COURIER/.test(s)) {
        const via = courier && !/pending|await|standard/i.test(courier) ? ` via ${courier}` : ''
        const trk = tracking && !/pending|await/i.test(tracking) ? ` Tracking: ${tracking}.` : ''
        return { title: 'Order Shipped', body: `Your order ${orderRef} is on its way${via}.${trk}`, href: orderHref }
      }
      if (/CANCEL/.test(s)) {
        return { title: 'Order Cancelled', body: `Your order ${orderRef} has been cancelled.`, href: orderHref }
      }
      if (/COMPLETE/.test(s)) {
        return { title: 'Order Completed', body: `Your order ${orderRef} is complete. Thanks for shopping with RePXL.`, href: orderHref }
      }
      if (/COD|AWAIT/.test(s)) {
        return { title: 'Order Received', body: `We received your Cash on Delivery request for order ${orderRef} and it's awaiting confirmation.`, href: orderHref }
      }
      const human = humanizeStatus(status)
      return {
        title: 'Order Update',
        body: human
          ? `Your order ${orderRef} is now ${human}.`
          : `There is an update on your order ${orderRef}.`,
        href: orderHref,
      }
    }

    case 'RETURN_RECEIVED': {
      return {
        title: 'Return Request Received',
        body: `We received your return request for order ${orderRef} and our team is reviewing it.`,
        href: orderHref,
      }
    }

    case 'RETURN_STATUS_CHANGE': {
      const status = clean(ctx.returnStatus) || clean(ctx.status)
      const human = humanizeStatus(status)
      return {
        title: 'Return Update',
        body: human
          ? `Your return request for order ${orderRef} is now ${human}.`
          : `There is an update on your return request for order ${orderRef}.`,
        href: orderHref,
      }
    }

    case 'REFUND_COMPLETED': {
      const amount = clean(ctx.refundAmount) || clean(ctx.orderTotal)
      return {
        title: 'Refund Processed',
        body: amount
          ? `Your refund of ${amount} for order ${orderRef} has been processed. Allow 1–5 business days for it to appear.`
          : `Your refund for order ${orderRef} has been processed. Allow 1–5 business days for it to appear.`,
        href: orderHref,
      }
    }

    case 'PROMOTION': {
      const title = clean(ctx.promoTitle) || clean(ctx.promotionTitle) || clean(input.fallbackTitle) || 'New Offer'
      const code = clean(ctx.promoCode) || clean(ctx.promotionCode)
      const bodyText =
        clean(ctx.promoBody) || clean(ctx.promotionBody) || clean(input.fallbackBody) ||
        'A new offer is available. Browse the collection to learn more.'
      const withCode = code ? `${bodyText} Use code ${code} at checkout.` : bodyText
      return { title, body: withCode, href: '/products' }
    }

    case 'REPIXL_UPDATE': {
      const title = clean(ctx.updateTitle) || clean(input.fallbackTitle) || 'RePXL Update'
      const bodyText =
        clean(ctx.updateBody) || clean(input.fallbackBody) || 'There is a new update from RePXL.'
      // REPIXL_UPDATE is also used for admin-facing COD alerts that reference an
      // order — link to the order when we have one, otherwise no destination.
      return { title, body: bodyText, href: orderHref }
    }

    default: {
      return {
        title: clean(input.fallbackTitle) || defaultTitleFor(input.event),
        body: clean(input.fallbackBody) || defaultBodyFor(input.event),
        href: orderHref,
      }
    }
  }
}
