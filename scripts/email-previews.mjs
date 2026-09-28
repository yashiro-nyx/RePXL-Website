/**
 * Email preview generator.
 *
 * Renders a representative HTML + plain-text preview for every RePXL email type
 * using realistic sample data, writing them to `email-previews/` for local
 * inspection in a browser. This NEVER sends email — it only renders strings.
 *
 * Usage:  node scripts/email-previews.mjs
 *
 * It shells out to `tsx` to import the TypeScript email builders directly, so it
 * always reflects the real templates (no duplicated markup here).
 */

import { mkdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const OUT_DIR = resolve('email-previews')
mkdirSync(OUT_DIR, { recursive: true })

// Import the compiled-on-the-fly TS templates via tsx's loader (the script is
// intended to be run with:  npx tsx scripts/email-previews.mjs).
const templates = await import(pathToFileURL(resolve('src/lib/email/templates.ts')).href)

const SAMPLE = {
  customerName: 'Alex Rivera',
  orderNumber: 'RPX-MTR9028',
  createdAt: new Date('2026-09-14T09:30:00+08:00'),
  items: [
    { name: 'Canon PowerShot G7 (Excellent)', quantity: 1, price: 12500 },
    { name: 'Sony Cyber-shot W800 (Good)', quantity: 2, price: 3200 },
  ],
  subtotal: 18900,
  shippingCost: 180,
  discount: 500,
  total: 18580,
  courierName: 'LBC Express',
  addressLines: ['Alex Rivera', '123 Katipunan Ave', 'Barangay Loyola Heights', 'Quezon City, Metro Manila', '1108'],
  resetUrl: 'https://repxlph.vercel.app/reset-password?token=sample-token-abc123',
  confirmUrl: 'https://repxlph.vercel.app/api/newsletter/confirm?token=sample-token',
}

/** Each entry: [key, builtEmail] */
const emails = [
  ['order-confirmation', templates.buildOrderConfirmationEmail({
    orderNumber: SAMPLE.orderNumber,
    customerName: SAMPLE.customerName,
    createdAt: SAMPLE.createdAt,
    paymentMethod: 'Card (Visa ****4242)',
    items: SAMPLE.items,
    subtotal: SAMPLE.subtotal,
    shippingCost: SAMPLE.shippingCost,
    discount: SAMPLE.discount,
    total: SAMPLE.total,
    courierName: SAMPLE.courierName,
    shippingAddressLines: SAMPLE.addressLines,
  })],
  ['order-shipped', templates.buildOrderStatusEmail({
    orderNumber: SAMPLE.orderNumber,
    customerName: SAMPLE.customerName,
    title: 'Order Shipped',
    message: `Your order #${SAMPLE.orderNumber} is on its way via ${SAMPLE.courierName}.`,
    details: [
      { label: 'Courier', value: SAMPLE.courierName },
      { label: 'Tracking number', value: 'LBC-992014881PH', mono: true },
      { label: 'Status', value: 'In transit', tone: 'success' },
    ],
    ctaLabel: 'Track Order',
  })],
  ['order-delivered', templates.buildOrderStatusEmail({
    orderNumber: SAMPLE.orderNumber,
    customerName: SAMPLE.customerName,
    title: 'Order Delivered',
    message: `Your order #${SAMPLE.orderNumber} has been delivered. We hope you enjoy your gear.`,
    ctaLabel: 'View Order',
  })],
  ['password-reset', templates.buildPasswordResetEmail({ resetUrl: SAMPLE.resetUrl, expiresInLabel: '1 hour' })],
  ['password-changed', templates.buildPasswordChangedEmail({
    email: 'alex@example.com',
    name: SAMPLE.customerName,
    changedAtLabel: 'Sep 14, 2026, 9:30 AM (PHT)',
    resetUrl: 'https://repxlph.vercel.app/forgot-password',
  })],
  ['verification-code', templates.buildVerificationCodeEmail({
    subject: 'Verify your identity — email change request',
    purpose: 'verify your identity before changing your email address',
    code: '481953',
    ttlMinutes: 10,
  })],
  ['security-notice', templates.buildSecurityNoticeEmail({ event: 'phone number was updated' })],
  ['newsletter-confirmation', templates.buildNewsletterConfirmationEmail({ confirmUrl: SAMPLE.confirmUrl, expiresInLabel: '24 hours' })],
]

const indexRows = []
for (const [key, email] of emails) {
  writeFileSync(resolve(OUT_DIR, `${key}.html`), email.html, 'utf8')
  writeFileSync(resolve(OUT_DIR, `${key}.txt`), email.text, 'utf8')
  indexRows.push(
    `<li><strong>${email.subject}</strong> — <a href="${key}.html">HTML</a> · <a href="${key}.txt">plain text</a></li>`
  )
  // Quick sanity assertions so a broken template fails the preview run.
  if (/\{\{|\}\}|\$\{|\[object Object\]|undefined|\bNaN\b/.test(email.html)) {
    throw new Error(`Preview "${key}" contains raw/technical content in HTML`)
  }
  if (/\{\{|\}\}|\$\{|\[object Object\]/.test(email.text)) {
    throw new Error(`Preview "${key}" contains raw/technical content in text`)
  }
}

writeFileSync(
  resolve(OUT_DIR, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>RePXL email previews</title>` +
    `<body style="font-family:system-ui;max-width:640px;margin:40px auto;padding:0 16px;">` +
    `<h1>RePXL email previews</h1><p>Generated ${new Date().toISOString()} — sample data only, no emails sent.</p>` +
    `<ul style="line-height:2;">${indexRows.join('')}</ul></body>`,
  'utf8'
)

console.log(`Wrote ${emails.length} email previews (HTML + text) to ${OUT_DIR}`)
console.log('Open email-previews/index.html in a browser to review.')
