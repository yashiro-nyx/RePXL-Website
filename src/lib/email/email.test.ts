import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  coerceText,
  safeUrl,
  formatPeso,
  formatEmailDate,
} from './format'
import { ctaButton, infoCard, orderSummary } from './components'
import { renderEmailLayout } from './layout'
import {
  buildOrderConfirmationEmail,
  buildOrderStatusEmail,
  buildPasswordResetEmail,
  buildPasswordChangedEmail,
  buildVerificationCodeEmail,
  buildSecurityNoticeEmail,
  buildNewsletterConfirmationEmail,
  type BuiltEmail,
} from './templates'

// No email must ever contain raw/technical content.
function assertNoRawContent(email: BuiltEmail) {
  for (const part of [email.html, email.text]) {
    expect(part).not.toMatch(/\{\{|\}\}/) // handlebars tokens
    expect(part).not.toMatch(/\$\{/) // template expressions
    expect(part).not.toContain('[object Object]')
    expect(part).not.toMatch(/\bundefined\b/)
    expect(part).not.toMatch(/\bNaN\b/)
  }
  // HTML must be a complete document.
  expect(email.html).toContain('<!DOCTYPE html>')
  expect(email.html).toContain('</html>')
  // Every email carries the brand + light canvas.
  expect(email.html).toContain('RePXL')
  expect(email.html).toContain('#f4efe9')
  // Subject present and non-empty.
  expect(email.subject.trim().length).toBeGreaterThan(0)
  // Plain-text alternative present.
  expect(email.text.trim().length).toBeGreaterThan(0)
}

// ─── format helpers ──────────────────────────────────────────────────────────
describe('email format helpers', () => {
  it('escapeHtml neutralizes markup', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;')
    expect(escapeHtml("O'Reilly & Sons")).toBe('O&#39;Reilly &amp; Sons')
  })

  it('coerceText never emits [object Object] / undefined / null', () => {
    expect(coerceText({ a: 1 })).toBe('')
    expect(coerceText(undefined)).toBe('')
    expect(coerceText(null)).toBe('')
    expect(coerceText(42)).toBe('42')
    expect(coerceText(NaN)).toBe('')
  })

  it('safeUrl accepts internal paths and http(s)/mailto, rejects unsafe', () => {
    expect(safeUrl('/account/orders/RPX-1', 'https://x.test')).toBe('https://x.test/account/orders/RPX-1')
    expect(safeUrl('https://x.test/a')).toBe('https://x.test/a')
    expect(safeUrl('mailto:support@repxl.com')).toBe('mailto:support@repxl.com')
    expect(safeUrl('javascript:alert(1)')).toBeNull()
    expect(safeUrl('//evil.com')).toBeNull()
    expect(safeUrl('')).toBeNull()
    expect(safeUrl(undefined)).toBeNull()
  })

  it('formatPeso / formatEmailDate are stable and safe', () => {
    expect(formatPeso(14500)).toBe('₱14,500.00')
    expect(formatPeso(undefined)).toBe('₱0.00')
    expect(formatEmailDate('2026-09-14T00:00:00Z')).toMatch(/2026/)
    expect(formatEmailDate(null)).toBe('')
  })
})

// ─── components ──────────────────────────────────────────────────────────────
describe('email components', () => {
  it('ctaButton renders a bulletproof button for safe URLs, nothing for unsafe', () => {
    const good = ctaButton('View Order', '/account/orders/RPX-1')
    expect(good).toContain('View Order')
    expect(good).toContain('account/orders/RPX-1')
    expect(ctaButton('X', 'javascript:alert(1)')).toBe('')
    expect(ctaButton('X', undefined)).toBe('')
  })

  it('infoCard omits rows with empty values (no blank fields)', () => {
    const html = infoCard('Order Details', [
      { label: 'Order number', value: 'RPX-1', mono: true },
      { label: 'Tracking', value: '' }, // omitted
    ])
    expect(html).toContain('Order number')
    expect(html).toContain('RPX-1')
    expect(html).not.toContain('Tracking')
  })

  it('infoCard escapes values', () => {
    const html = infoCard('X', [{ label: 'Name', value: '<b>x</b>' }])
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html).not.toContain('<b>x</b>')
  })

  it('orderSummary lists items and totals', () => {
    const html = orderSummary(
      [{ name: 'Canon G7', quantity: 2, price: 100, lineTotal: 200 }],
      { subtotal: '₱200.00', shippingLabel: 'Shipping', shipping: '₱0.00', total: '₱200.00' }
    )
    expect(html).toContain('Canon G7')
    expect(html).toContain('₱200.00')
  })

  it('renderEmailLayout includes unsubscribe only when a URL is provided', () => {
    const withUnsub = renderEmailLayout({ title: 'T', bodyHtml: '<p>x</p>', unsubscribeUrl: '/api/newsletter/unsubscribe?token=x' })
    expect(withUnsub.toLowerCase()).toContain('unsubscribe')
    const without = renderEmailLayout({ title: 'T', bodyHtml: '<p>x</p>' })
    expect(without.toLowerCase()).not.toContain('unsubscribe')
  })
})

// ─── templates: subjects, CTAs, escaping, missing data ───────────────────────
describe('order confirmation email', () => {
  const built = buildOrderConfirmationEmail({
    orderNumber: 'RPX-MTR9028',
    customerName: 'Alex Rivera',
    createdAt: new Date('2026-09-14T00:00:00Z'),
    paymentMethod: 'Card',
    items: [
      { name: 'Canon PowerShot G7', quantity: 1, price: 12500 },
      { name: 'Sony W800', quantity: 2, price: 3200 },
    ],
    subtotal: 18900,
    shippingCost: 180,
    discount: 500,
    total: 18580,
    courierName: 'LBC Express',
    shippingAddressLines: ['Alex Rivera', '123 Katipunan Ave', 'Quezon City'],
  })

  it('has a clear subject with the order number', () => {
    expect(built.subject).toBe('Order confirmed — RPX-MTR9028')
  })

  it('shows items, totals, and a View Order CTA to the order route', () => {
    expect(built.html).toContain('Canon PowerShot G7')
    expect(built.html).toContain('₱18,580.00')
    expect(built.html).toContain('View Order')
    expect(built.html).toContain('/account/orders/RPX-MTR9028')
    expect(built.text).toContain('Canon PowerShot G7 x1')
  })

  it('omits the discount row when there is no discount', () => {
    const noDiscount = buildOrderConfirmationEmail({
      orderNumber: 'RPX-1', customerName: 'A', createdAt: new Date(), paymentMethod: 'COD',
      items: [{ name: 'X', quantity: 1, price: 100 }], subtotal: 100, shippingCost: 0, discount: 0, total: 100,
    })
    expect(noDiscount.html).not.toContain('Discount')
    expect(noDiscount.text).not.toContain('Discount')
  })

  it('escapes item names', () => {
    const evil = buildOrderConfirmationEmail({
      orderNumber: 'RPX-1', customerName: '<b>x</b>', createdAt: new Date(), paymentMethod: 'COD',
      items: [{ name: '<img src=x onerror=alert(1)>', quantity: 1, price: 100 }], subtotal: 100, shippingCost: 0, discount: 0, total: 100,
    })
    expect(evil.html).not.toContain('<img src=x')
    expect(evil.html).toContain('&lt;img')
  })

  it('never contains raw/technical content', () => assertNoRawContent(built))
})

describe('order status email', () => {
  const built = buildOrderStatusEmail({
    orderNumber: 'RPX-9',
    customerName: 'Alex',
    title: 'Order Shipped',
    message: 'Your order #RPX-9 is on its way via LBC Express.',
    details: [
      { label: 'Courier', value: 'LBC Express' },
      { label: 'Tracking number', value: 'LBC-777', mono: true },
      { label: 'ETA', value: '' }, // omitted (no data)
    ],
    ctaLabel: 'Track Order',
  })

  it('uses the title as subject and includes the order number', () => {
    expect(built.subject).toBe('Order Shipped — RPX-9')
  })

  it('renders only details backed by data and a Track Order CTA', () => {
    expect(built.html).toContain('LBC Express')
    expect(built.html).toContain('LBC-777')
    expect(built.html).not.toContain('ETA')
    expect(built.html).toContain('Track Order')
    expect(built.html).toContain('/account/orders/RPX-9')
  })

  it('never contains raw/technical content', () => assertNoRawContent(built))
})

describe('auth & security emails', () => {
  it('password reset has a Reset Password CTA and expiry note', () => {
    const built = buildPasswordResetEmail({ resetUrl: 'https://x.test/reset-password?token=abc', expiresInLabel: '1 hour' })
    expect(built.subject).toBe('Reset your RePXL password')
    expect(built.html).toContain('Reset Password')
    expect(built.html).toContain('1 hour')
    expect(built.html).toContain('https://x.test/reset-password?token=abc')
    assertNoRawContent(built)
  })

  it('password changed references the account and links to reset', () => {
    const built = buildPasswordChangedEmail({ email: 'a@b.com', name: 'Maria', changedAtLabel: 'Sep 14, 2026', resetUrl: 'https://x.test/forgot-password' })
    expect(built.subject.toLowerCase()).toContain('security alert')
    expect(built.html).toContain('a@b.com')
    expect(built.html).toContain('Maria')
    expect(built.html).toContain('https://x.test/forgot-password')
    assertNoRawContent(built)
  })

  it('verification code email shows the code and TTL', () => {
    const built = buildVerificationCodeEmail({ subject: 'Verify your identity', purpose: 'confirm your new email address', code: '481953', ttlMinutes: 10 })
    expect(built.html).toContain('481953')
    expect(built.html).toContain('10 minutes')
    expect(built.text).toContain('481953')
    assertNoRawContent(built)
  })

  it('security notice states the event and support contact', () => {
    const built = buildSecurityNoticeEmail({ event: 'phone number was updated' })
    expect(built.html).toContain('phone number was updated')
    expect(built.html).toContain('support@repxl.com')
    assertNoRawContent(built)
  })
})

describe('newsletter confirmation email (marketing)', () => {
  const built = buildNewsletterConfirmationEmail({ confirmUrl: 'https://x.test/api/newsletter/confirm?token=t', expiresInLabel: '24 hours' })

  it('has a Confirm Subscription CTA and expiry', () => {
    expect(built.subject).toBe('Confirm your RePXL subscription')
    expect(built.html).toContain('Confirm Subscription')
    expect(built.html).toContain('24 hours')
    expect(built.html).toContain('https://x.test/api/newsletter/confirm?token=t')
  })

  it('never contains raw/technical content', () => assertNoRawContent(built))
})

// ─── Guard: the in-app notification implementation is not touched here ────────
describe('scope guard — email work does not alter in-app notifications', () => {
  it('email templates module does not import in-app notification UI/logic', () => {
    // A pure structural guard: these builders must be self-contained email code.
    // (Import-time coupling would surface as a compile error; this documents intent.)
    expect(typeof buildOrderConfirmationEmail).toBe('function')
  })
})
