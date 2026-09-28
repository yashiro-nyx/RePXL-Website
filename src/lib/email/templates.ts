/**
 * Per-type email builders. Each returns `{ subject, html, text }` composed from
 * the shared layout + components, so every email shares one visual identity and
 * every dynamic value is escaped/validated. Templates only render fields backed
 * by real data — missing optional values are omitted, never faked.
 *
 * These builders are pure (no I/O), so they are easy to unit-test and to render
 * as previews. Sending remains the responsibility of the existing mailer/route
 * infrastructure.
 */

import {
  greeting,
  paragraph,
  ctaButton,
  fallbackLink,
  infoCard,
  labeledBlock,
  orderSummary,
  callout,
  codeBlock,
  divider,
  type InfoRow,
  type OrderSummaryItem,
} from './components'
import { renderEmailLayout, defaultFooterLinks, type EmailFooterLink } from './layout'
import { escapeHtml, safeUrl, siteOrigin, formatPeso, formatEmailDate, normalizePlainText } from './format'

export interface BuiltEmail {
  subject: string
  html: string
  text: string
}

// ─── Order confirmation ──────────────────────────────────────────────────────

export interface OrderConfirmationInput {
  orderNumber: string
  customerName: string
  createdAt: Date | string
  paymentMethod: string
  items: Array<{ name: string; quantity: number; price: number }>
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  courierName?: string | null
  shippingAddressLines?: string[]
}

export function buildOrderConfirmationEmail(input: OrderConfirmationInput): BuiltEmail {
  const orderNo = input.orderNumber
  const date = formatEmailDate(input.createdAt)
  const orderUrl = `/account/orders/${orderNo}`

  const items: OrderSummaryItem[] = input.items.map((it) => ({
    name: it.name,
    quantity: it.quantity,
    price: it.price,
    lineTotal: it.price * it.quantity,
  }))

  const meta = infoCard('Order Details', [
    { label: 'Order number', value: orderNo, mono: true, tone: 'accent' },
    { label: 'Order date', value: date },
    { label: 'Payment method', value: input.paymentMethod ?? '' },
  ])

  const summary = orderSummary(items, {
    subtotal: formatPeso(input.subtotal),
    discount: input.discount > 0 ? `-${formatPeso(input.discount)}` : undefined,
    shippingLabel: input.courierName ? `Shipping (${input.courierName})` : 'Shipping',
    shipping: formatPeso(input.shippingCost),
    total: formatPeso(input.total),
  })

  const addressLines = (input.shippingAddressLines ?? []).filter((l) => l && l.trim().length > 0)
  const addressBlock = addressLines.length
    ? labeledBlock('Shipping to', addressLines.map((l) => escapeHtml(l)).join('<br />'))
    : ''

  const bodyHtml = [
    greeting(input.customerName),
    paragraph(`Thanks for your order. We've received it and our team is preparing your gear for shipment. Here's a summary for your records.`, { muted: true }),
    meta,
    summary,
    addressBlock,
    ctaButton('View Order', orderUrl),
  ]
    .filter(Boolean)
    .join('\n')

  const html = renderEmailLayout({
    title: 'Order Confirmed',
    heading: 'Order Confirmed',
    preheader: `Your order ${orderNo} is confirmed and being prepared.`,
    bodyHtml,
    footerLinks: defaultFooterLinks(),
  })

  const text = normalizePlainText(
    [
      `Order Confirmed — ${orderNo}`,
      ``,
      `Hi ${input.customerName || 'there'},`,
      `Thanks for your order. We've received it and are preparing your gear for shipment.`,
      ``,
      `Order number: ${orderNo}`,
      date ? `Order date: ${date}` : '',
      input.paymentMethod ? `Payment method: ${input.paymentMethod}` : '',
      ``,
      `Items`,
      ...items.map((it) => `- ${it.name} x${it.quantity} @ ${formatPeso(it.price)} = ${formatPeso(it.lineTotal)}`),
      ``,
      `Subtotal: ${formatPeso(input.subtotal)}`,
      input.discount > 0 ? `Discount: -${formatPeso(input.discount)}` : '',
      `Shipping${input.courierName ? ` (${input.courierName})` : ''}: ${formatPeso(input.shippingCost)}`,
      `Total: ${formatPeso(input.total)}`,
      ``,
      addressLines.length ? `Shipping to:\n${addressLines.join('\n')}` : '',
      ``,
      `View your order: ${absolute(orderUrl)}`,
    ].join('\n')
  )

  return { subject: `Order confirmed — ${orderNo}`, html, text }
}

// ─── Order status update (shipped / delivered / cancelled / generic) ─────────

export interface OrderStatusInput {
  orderNumber: string
  customerName: string
  /** Short human title, e.g. "Order Shipped". */
  title: string
  /** One or two concise sentences. */
  message: string
  /** Optional structured details (courier, tracking, etc.) — only real data. */
  details?: InfoRow[]
  /** CTA label, defaults to "Track Order". */
  ctaLabel?: string
}

export function buildOrderStatusEmail(input: OrderStatusInput): BuiltEmail {
  const orderNo = input.orderNumber
  const orderUrl = `/account/orders/${orderNo}`

  const bodyHtml = [
    greeting(input.customerName),
    paragraph(escapeHtml(input.message), { muted: true }),
    input.details && input.details.length ? infoCard('Order Details', input.details) : '',
    ctaButton(input.ctaLabel ?? 'Track Order', orderUrl),
  ]
    .filter(Boolean)
    .join('\n')

  const html = renderEmailLayout({
    title: input.title,
    heading: input.title,
    preheader: input.message,
    bodyHtml,
    footerLinks: defaultFooterLinks(),
  })

  const detailLines = (input.details ?? [])
    .filter((d) => (d.value ?? '').toString().trim())
    .map((d) => `${d.label}: ${d.value}`)

  const text = normalizePlainText(
    [
      `${input.title} — ${orderNo}`,
      ``,
      `Hi ${input.customerName || 'there'},`,
      input.message,
      ``,
      ...detailLines,
      ``,
      `${input.ctaLabel ?? 'Track your order'}: ${absolute(orderUrl)}`,
    ].join('\n')
  )

  return { subject: `${input.title} — ${orderNo}`, html, text }
}

// ─── Password reset ──────────────────────────────────────────────────────────

export function buildPasswordResetEmail(input: { resetUrl: string; expiresInLabel?: string }): BuiltEmail {
  const expires = input.expiresInLabel ?? '1 hour'
  const bodyHtml = [
    paragraph(`We received a request to reset the password for your RePXL account. Click the button below to choose a new password.`),
    ctaButton('Reset Password', input.resetUrl),
    paragraph(`For your security, this link expires in <strong>${escapeHtml(expires)}</strong> and can be used once.`, { muted: true }),
    fallbackLink(input.resetUrl),
    divider(),
    paragraph(`If you didn't request a password reset, you can safely ignore this email — your password will not change.`, { muted: true }),
  ]
    .filter(Boolean)
    .join('\n')

  const html = renderEmailLayout({
    title: 'Reset your password',
    heading: 'Reset your password',
    preheader: 'Choose a new password for your RePXL account.',
    bodyHtml,
    footerNote: 'For your security, RePXL will never ask for your password by email.',
  })

  const href = safeUrl(input.resetUrl) ?? ''
  const text = normalizePlainText(
    [
      `Reset your RePXL password`,
      ``,
      `We received a request to reset the password for your RePXL account.`,
      `Choose a new password using the link below (expires in ${expires}, single use):`,
      href,
      ``,
      `If you didn't request this, you can safely ignore this email — your password will not change.`,
    ].join('\n')
  )

  return { subject: 'Reset your RePXL password', html, text }
}

// ─── Password changed (security alert) ───────────────────────────────────────

export function buildPasswordChangedEmail(input: { email: string; name?: string; changedAtLabel: string; resetUrl: string }): BuiltEmail {
  const name = (input.name ?? '').trim() || 'there'
  const bodyHtml = [
    greeting(name),
    paragraph(`This is a confirmation that the password for your RePXL account (<strong>${escapeHtml(input.email)}</strong>) was changed on <strong>${escapeHtml(input.changedAtLabel)}</strong>.`),
    callout(
      `<strong>Didn't make this change?</strong> Your account may be at risk. Reset your password now and contact <a href="mailto:support@repxl.com" style="color:inherit;text-decoration:underline;">support@repxl.com</a>.`
    ),
    ctaButton('Secure My Account', input.resetUrl),
  ]
    .filter(Boolean)
    .join('\n')

  const html = renderEmailLayout({
    title: 'Your password was changed',
    heading: 'Your password was changed',
    preheader: `Your RePXL password was updated on ${input.changedAtLabel}.`,
    bodyHtml,
    footerNote: 'This is an automated security notification to help protect your account.',
  })

  const href = safeUrl(input.resetUrl) ?? ''
  const text = normalizePlainText(
    [
      `Security alert: your RePXL password was changed`,
      ``,
      `Hi ${name},`,
      `The password for your RePXL account (${input.email}) was changed on ${input.changedAtLabel}.`,
      ``,
      `If you made this change, no action is needed.`,
      `If you did NOT make this change, reset your password now and contact support@repxl.com:`,
      href,
    ].join('\n')
  )

  return { subject: 'Security alert: your RePXL password was changed', html, text }
}

// ─── Verification code (OTP for sensitive changes) ───────────────────────────

export function buildVerificationCodeEmail(input: { subject: string; purpose: string; code: string; ttlMinutes: number }): BuiltEmail {
  const bodyHtml = [
    paragraph(`Use the verification code below to ${escapeHtml(input.purpose)}.`),
    codeBlock(input.code),
    paragraph(`This code expires in <strong>${input.ttlMinutes} minutes</strong> and can be used once.`, { muted: true }),
    paragraph(`If you didn't request this, you can safely ignore this email.`, { muted: true }),
  ].join('\n')

  const html = renderEmailLayout({
    title: input.subject,
    heading: 'Verify your identity',
    preheader: `Your RePXL verification code (expires in ${input.ttlMinutes} minutes).`,
    bodyHtml,
    footerNote: 'For your security, never share this code with anyone.',
  })

  const text = normalizePlainText(
    [
      `Your RePXL verification code: ${input.code}`,
      ``,
      `Use it to ${input.purpose}.`,
      `This code expires in ${input.ttlMinutes} minutes and can be used once.`,
      ``,
      `If you didn't request this, ignore this email.`,
    ].join('\n')
  )

  return { subject: input.subject, html, text }
}

// ─── Security notice (generic account change) ────────────────────────────────

export function buildSecurityNoticeEmail(input: { event: string }): BuiltEmail {
  const event = input.event
  const bodyHtml = [
    paragraph(`This is a confirmation that your RePXL account ${escapeHtml(event)}.`),
    callout(`<strong>Didn't make this change?</strong> Please contact <a href="mailto:support@repxl.com" style="color:inherit;text-decoration:underline;">support@repxl.com</a> right away.`),
  ].join('\n')

  const html = renderEmailLayout({
    title: 'RePXL account security',
    heading: 'Account security notice',
    preheader: `Your RePXL account ${event}.`,
    bodyHtml,
    footerNote: 'This is an automated security notification.',
  })

  const text = normalizePlainText(
    [
      `RePXL security notice`,
      ``,
      `Your RePXL account ${event}.`,
      `If you did not make this change, contact support@repxl.com immediately.`,
    ].join('\n')
  )

  return { subject: `RePXL security: ${event}`, html, text }
}

// ─── Newsletter confirmation (double opt-in, marketing) ──────────────────────

export function buildNewsletterConfirmationEmail(input: { confirmUrl: string; expiresInLabel?: string }): BuiltEmail {
  const expires = input.expiresInLabel ?? '24 hours'
  const bodyHtml = [
    paragraph(`Please confirm your subscription to the RePXL newsletter — your source for new vintage camera arrivals, restocks, and collector stories.`),
    ctaButton('Confirm Subscription', input.confirmUrl),
    paragraph(`This link expires in <strong>${escapeHtml(expires)}</strong>.`, { muted: true }),
    fallbackLink(input.confirmUrl),
    divider(),
    paragraph(`If you didn't request this, you can ignore this email and you won't be subscribed.`, { muted: true }),
  ]
    .filter(Boolean)
    .join('\n')

  const html = renderEmailLayout({
    title: 'Confirm your subscription',
    heading: 'Confirm your subscription',
    preheader: 'One click to start receiving RePXL updates.',
    bodyHtml,
    footerLinks: [{ label: 'Shop Cameras', url: '/products' }],
  })

  const href = safeUrl(input.confirmUrl) ?? ''
  const text = normalizePlainText(
    [
      `Confirm your RePXL newsletter subscription`,
      ``,
      `Confirm your subscription using the link below (expires in ${expires}):`,
      href,
      ``,
      `If you didn't request this, ignore this email — you won't be subscribed.`,
    ].join('\n')
  )

  return { subject: 'Confirm your RePXL subscription', html, text }
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function absolute(path: string): string {
  return safeUrl(path) ?? `${siteOrigin()}${path}`
}

export type { EmailFooterLink }
