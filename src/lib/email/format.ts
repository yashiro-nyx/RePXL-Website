/**
 * Safe formatting helpers for email templates.
 *
 * Every dynamic value that lands in email HTML must pass through `escapeHtml`
 * (text) or `safeUrl` (href) so emails can never contain broken HTML, injected
 * markup, unresolved placeholders, `[object Object]`, or unsafe links.
 */

/** Escape a value for safe interpolation into HTML text/attributes. */
export function escapeHtml(value: unknown): string {
  return coerceText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Coerce any value to a display string without ever emitting `[object Object]`,
 * `undefined`, `null`, or a serialized object. Non-primitive or nullish values
 * become an empty string so a missing field renders as blank, not as garbage.
 */
export function coerceText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  // Objects/arrays/functions are never rendered raw.
  return ''
}

/**
 * Validate and normalize a URL for use in an email link.
 *
 * - Accepts internal absolute paths ("/account/orders/RPX-1") and resolves them
 *   against the site origin.
 * - Accepts absolute http(s) and mailto URLs.
 * - Rejects everything else (javascript:, data:, protocol-relative, etc.),
 *   returning null so the caller can omit the link rather than emit an unsafe one.
 */
export function safeUrl(value: string | null | undefined, siteUrl = siteOrigin()): string | null {
  if (typeof value !== 'string') return null
  const v = value.trim()
  if (v.length === 0) return null

  // Internal absolute path.
  if (v.startsWith('/') && !v.startsWith('//')) {
    if (v.includes('\\')) return null
    return `${siteUrl.replace(/\/+$/, '')}${v}`
  }

  if (/^mailto:[^\s]+@[^\s]+$/i.test(v)) return v

  try {
    const u = new URL(v)
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.toString()
    return null
  } catch {
    return null
  }
}

/** The configured public site origin (no trailing slash). */
export function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  return raw.replace(/\/+$/, '')
}

/** Format a peso amount consistently (e.g. 14500 → "₱14,500.00"). */
export function formatPeso(amount: number | null | undefined): string {
  const n = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Format a date consistently (e.g. "September 14, 2026"). Falsy → "". */
export function formatEmailDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Collapse a plain-text body: trim, drop blank-only lines at the edges, and
 * normalize spacing. Used to build the text/plain alternative.
 */
export function normalizePlainText(text: string): string {
  return text
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
