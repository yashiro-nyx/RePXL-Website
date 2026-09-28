/**
 * Reusable, email-client-compatible building blocks for RePXL emails.
 *
 * Each function returns an inline-styled HTML string. They are composed by the
 * layout (see layout.ts) and by individual templates. All dynamic text must be
 * pre-escaped by the caller via `escapeHtml`; URLs via `safeUrl`.
 *
 * Table-based, inline-CSS markup only — no <style>, classes, flexbox, or grid —
 * so it renders consistently in Gmail (desktop + mobile) and other clients.
 */

import {
  EMAIL_COLORS as C,
  EMAIL_FONT_SANS,
  EMAIL_FONT_SERIF,
  EMAIL_FONT_MONO,
} from './tokens'
import { escapeHtml, safeUrl } from './format'

/** A body paragraph with consistent spacing/typography. `html` is trusted. */
export function paragraph(html: string, opts: { muted?: boolean; marginTop?: number } = {}): string {
  const color = opts.muted ? C.textMuted : C.text
  const mt = opts.marginTop ?? 0
  return `<p style="margin:${mt}px 0 16px;font-family:${EMAIL_FONT_SANS};font-size:15px;line-height:1.65;color:${color};">${html}</p>`
}

/** Personalized greeting line. Name is escaped; falls back to "there". */
export function greeting(name: string | null | undefined): string {
  const safeName = escapeHtml((name ?? '').trim()) || 'there'
  return `<p style="margin:0 0 16px;font-family:${EMAIL_FONT_SANS};font-size:16px;font-weight:600;color:${C.text};">Hi ${safeName},</p>`
}

/** A thin horizontal divider. */
export function divider(opts: { margin?: number } = {}): string {
  const m = opts.margin ?? 24
  return `<div style="height:1px;line-height:1px;font-size:0;background-color:${C.border};margin:${m}px 0;">&nbsp;</div>`
}

/**
 * Primary CTA button (bulletproof, table-based). Returns '' when the URL is
 * unsafe/missing so a template never renders a broken or misleading button.
 */
export function ctaButton(label: string, url: string | null | undefined): string {
  const href = safeUrl(url)
  if (!href) return ''
  const text = escapeHtml(label)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:28px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
      <tr><td bgcolor="${C.accent}" style="border-radius:6px;">
        <a href="${href}" target="_blank" rel="noopener noreferrer"
           style="display:inline-block;padding:14px 34px;font-family:${EMAIL_FONT_SANS};font-size:15px;font-weight:700;letter-spacing:0.3px;color:${C.onAccent};background-color:${C.accent};text-decoration:none;border-radius:6px;">${text}</a>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

/** A fallback "or copy this link" block for auth emails. Empty when unsafe. */
export function fallbackLink(url: string | null | undefined, note = 'If the button does not work, copy and paste this link into your browser:'): string {
  const href = safeUrl(url)
  if (!href) return ''
  return `<p style="margin:0 0 6px;font-family:${EMAIL_FONT_SANS};font-size:12px;line-height:1.6;color:${C.textMuted};">${escapeHtml(note)}</p>
<p style="margin:0;font-family:${EMAIL_FONT_MONO};font-size:12px;line-height:1.6;color:${C.textMuted};word-break:break-all;">${escapeHtml(href)}</p>`
}

export interface InfoRow {
  label: string
  /** Pre-escaped or plain value; will be escaped here. */
  value: string
  /** Optional value color token (e.g. success/warning/accent). */
  tone?: 'default' | 'muted' | 'success' | 'warning' | 'accent'
  /** Render value in monospace (order numbers, codes). */
  mono?: boolean
}

function toneColor(tone: InfoRow['tone']): string {
  switch (tone) {
    case 'muted': return C.textMuted
    case 'success': return C.success
    case 'warning': return C.warning
    case 'accent': return C.accent
    default: return C.text
  }
}

/**
 * A bordered "information card": a titled 2-column key/value list. Rows with an
 * empty value are omitted, so only fields backed by real data appear.
 */
export function infoCard(title: string, rows: InfoRow[]): string {
  const present = rows.filter((r) => (r.value ?? '').toString().trim().length > 0)
  if (present.length === 0) return ''
  const rowsHtml = present
    .map(
      (r) => `<tr>
        <td style="padding:7px 0;font-family:${EMAIL_FONT_SANS};font-size:13px;color:${C.textMuted};vertical-align:top;">${escapeHtml(r.label)}</td>
        <td style="padding:7px 0;font-family:${r.mono ? EMAIL_FONT_MONO : EMAIL_FONT_SANS};font-size:13px;font-weight:600;color:${toneColor(r.tone)};text-align:right;vertical-align:top;word-break:break-word;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join('')
  return card(`
    <p style="margin:0 0 8px;font-family:${EMAIL_FONT_MONO};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${C.textFaint};">${escapeHtml(title)}</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${rowsHtml}</table>
  `)
}

/** A plain bordered container used by info/address cards. `inner` is trusted. */
export function card(inner: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;background-color:${C.surfaceMuted};border:1px solid ${C.border};border-radius:8px;">
  <tr><td style="padding:16px 18px;">${inner}</td></tr>
</table>`
}

/** A free-form titled card (e.g. shipping address block). `bodyHtml` is trusted. */
export function labeledBlock(title: string, bodyHtml: string): string {
  if (!bodyHtml || bodyHtml.trim().length === 0) return ''
  return card(`
    <p style="margin:0 0 6px;font-family:${EMAIL_FONT_MONO};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${C.textFaint};">${escapeHtml(title)}</p>
    <div style="font-family:${EMAIL_FONT_SANS};font-size:13px;line-height:1.7;color:${C.text};">${bodyHtml}</div>
  `)
}

export interface OrderSummaryItem {
  name: string
  quantity: number
  /** Unit price. */
  price: number
  /** Line total (price * quantity). */
  lineTotal: number
}

export interface OrderSummaryTotals {
  subtotalLabel?: string
  subtotal: string
  /** Optional discount (already formatted, e.g. "-₱500.00"). Omitted if blank. */
  discount?: string
  shippingLabel: string
  shipping: string
  totalLabel?: string
  total: string
}

/**
 * A clean, scannable order summary: line items table + totals. Amounts must be
 * pre-formatted strings (via formatPeso). Item names are escaped here.
 */
export function orderSummary(items: OrderSummaryItem[], totals: OrderSummaryTotals): string {
  const headerCell = (text: string, align: 'left' | 'center' | 'right') =>
    `<td style="padding:0 0 6px;font-family:${EMAIL_FONT_MONO};font-size:9px;text-transform:uppercase;letter-spacing:1px;color:${C.textFaint};text-align:${align};border-bottom:1px solid ${C.borderStrong};">${text}</td>`

  const itemRows = items
    .map(
      (it) => `<tr>
      <td style="padding:10px 0;font-family:${EMAIL_FONT_SANS};font-size:13px;color:${C.text};border-bottom:1px solid ${C.border};">${escapeHtml(it.name)}</td>
      <td style="padding:10px 0;font-family:${EMAIL_FONT_MONO};font-size:13px;color:${C.textMuted};text-align:center;border-bottom:1px solid ${C.border};">${it.quantity}</td>
      <td style="padding:10px 8px 10px 0;font-family:${EMAIL_FONT_MONO};font-size:13px;color:${C.textMuted};text-align:right;border-bottom:1px solid ${C.border};">${escapeHtml(formatOrEmpty(it.price))}</td>
      <td style="padding:10px 0;font-family:${EMAIL_FONT_MONO};font-size:13px;color:${C.text};text-align:right;border-bottom:1px solid ${C.border};">${escapeHtml(formatOrEmpty(it.lineTotal))}</td>
    </tr>`
    )
    .join('')

  const totalRow = (label: string, value: string, opts: { strong?: boolean; tone?: InfoRow['tone'] } = {}) =>
    `<tr>
      <td style="padding:${opts.strong ? '10' : '3'}px 0 3px;font-family:${EMAIL_FONT_SANS};font-size:${opts.strong ? '15' : '13'}px;font-weight:${opts.strong ? '700' : '400'};color:${opts.strong ? C.text : C.textMuted};${opts.strong ? `border-top:1px solid ${C.borderStrong};` : ''}">${escapeHtml(label)}</td>
      <td style="padding:${opts.strong ? '10' : '3'}px 0 3px;font-family:${EMAIL_FONT_MONO};font-size:${opts.strong ? '16' : '13'}px;font-weight:${opts.strong ? '700' : '400'};color:${toneColor(opts.tone ?? (opts.strong ? 'default' : 'muted'))};text-align:right;${opts.strong ? `border-top:1px solid ${C.borderStrong};` : ''}">${escapeHtml(value)}</td>
    </tr>`

  return `<p style="margin:0 0 8px;font-family:${EMAIL_FONT_MONO};font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:${C.textFaint};">Order Summary</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 18px;">
  <tr>${headerCell('Item', 'left')}${headerCell('Qty', 'center')}${headerCell('Unit', 'right')}${headerCell('Total', 'right')}</tr>
  ${itemRows}
</table>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;">
  ${totalRow(totals.subtotalLabel ?? 'Subtotal', totals.subtotal)}
  ${totals.discount && totals.discount.trim() ? totalRow('Discount', totals.discount, { tone: 'success' }) : ''}
  ${totalRow(totals.shippingLabel, totals.shipping)}
  ${totalRow(totals.totalLabel ?? 'Total', totals.total, { strong: true })}
</table>`
}

function formatOrEmpty(n: number): string {
  return `₱${(Number.isFinite(n) ? n : 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** A subtle callout box for security/important notes. `bodyHtml` is trusted. */
export function callout(bodyHtml: string, tone: 'accent' | 'warning' = 'accent'): string {
  const color = tone === 'warning' ? C.warning : C.accent
  const bg = tone === 'warning' ? 'rgba(176,111,31,0.06)' : 'rgba(194,44,44,0.05)'
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0;">
  <tr><td style="background-color:${bg};border-left:3px solid ${color};border-radius:2px;padding:12px 16px;font-family:${EMAIL_FONT_SANS};font-size:13px;line-height:1.6;color:${C.text};">${bodyHtml}</td></tr>
</table>`
}

/** A large, spaced verification code block (for OTP emails). */
export function codeBlock(code: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 20px;">
  <tr><td align="center">
    <span style="display:inline-block;background-color:${C.surfaceMuted};border:1px solid ${C.borderStrong};border-radius:8px;padding:16px 28px;font-family:${EMAIL_FONT_MONO};font-size:28px;font-weight:700;letter-spacing:8px;color:${C.text};">${escapeHtml(code)}</span>
  </td></tr>
</table>`
}

export { EMAIL_FONT_SERIF, EMAIL_FONT_SANS, EMAIL_FONT_MONO }
