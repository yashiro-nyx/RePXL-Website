import { describe, it, expect } from 'vitest'
import {
  buildInAppNotification,
  serializeInAppContent,
  parseInAppMessage,
  sanitizeInAppMessage,
  looksMalformed,
  displayCategoryFor,
  humanizeStatus,
  isInternalHref,
  INAPP_ENVELOPE_PREFIX,
  defaultBodyFor,
  type InAppContent,
} from './notification-inapp'

// Helper: assert no raw code-like content ever appears.
function assertClean(text: string) {
  expect(text).not.toMatch(/\{\{|\}\}/) // no handlebars tokens
  expect(text).not.toMatch(/\$\{/) // no template expressions
  expect(text).not.toContain('[object Object]')
  expect(text).not.toMatch(/"\w+"\s*:/) // no JSON fragments
  expect(text).not.toMatch(/https?:\/\//) // no raw URLs in body copy
}

// ─── buildInAppNotification: correct, human-readable copy per event ──────────
describe('buildInAppNotification — concise, human-readable content', () => {
  it('ORDER_CONFIRMATION uses the real order number and a clear title', () => {
    const c = buildInAppNotification({ event: 'ORDER_CONFIRMATION', context: { orderNumber: 'RPX-1024' } })
    expect(c.title).toBe('Order Confirmed')
    expect(c.body).toContain('#RPX-1024')
    expect(c.href).toBe('/account/orders/RPX-1024')
    assertClean(c.body)
  })

  it('ORDER_STATUS_CHANGE → shipped copy for a shipping status, with courier/tracking', () => {
    const c = buildInAppNotification({
      event: 'ORDER_STATUS_CHANGE',
      context: { orderNumber: 'RPX-1024', status: 'SHIPPED', courierName: 'LBC Express', trackingNumber: 'LBC-777' },
    })
    expect(c.title).toBe('Order Shipped')
    expect(c.body).toContain('#RPX-1024')
    expect(c.body).toContain('LBC Express')
    expect(c.body).toContain('LBC-777')
    assertClean(c.body)
  })

  it('ORDER_STATUS_CHANGE → delivered / cancelled / completed variants', () => {
    expect(buildInAppNotification({ event: 'ORDER_STATUS_CHANGE', context: { orderNumber: 'RPX-1', status: 'DELIVERED' } }).title).toBe('Order Delivered')
    expect(buildInAppNotification({ event: 'ORDER_STATUS_CHANGE', context: { orderNumber: 'RPX-1', status: 'CANCELLED' } }).title).toBe('Order Cancelled')
    expect(buildInAppNotification({ event: 'ORDER_STATUS_CHANGE', context: { orderNumber: 'RPX-1', status: 'COMPLETED' } }).title).toBe('Order Completed')
  })

  it('ORDER_STATUS_CHANGE with an unknown status humanizes it without raw tokens', () => {
    const c = buildInAppNotification({ event: 'ORDER_STATUS_CHANGE', context: { orderNumber: 'RPX-9021', status: 'PROCESSING' } })
    expect(c.body).toContain('#RPX-9021')
    expect(c.body.toLowerCase()).toContain('processing')
    assertClean(c.body)
  })

  it('RETURN_RECEIVED / RETURN_STATUS_CHANGE reference the order and link to it', () => {
    const recv = buildInAppNotification({ event: 'RETURN_RECEIVED', context: { orderNumber: 'RPX-5' } })
    expect(recv.title).toBe('Return Request Received')
    expect(recv.href).toBe('/account/orders/RPX-5')
    const upd = buildInAppNotification({ event: 'RETURN_STATUS_CHANGE', context: { orderNumber: 'RPX-5', returnStatus: 'APPROVED' } })
    expect(upd.title).toBe('Return Update')
    expect(upd.body.toLowerCase()).toContain('approved')
    assertClean(upd.body)
  })

  it('REFUND_COMPLETED shows the amount when present', () => {
    const c = buildInAppNotification({ event: 'REFUND_COMPLETED', context: { orderNumber: 'RPX-5', refundAmount: '₱14,500.00' } })
    expect(c.title).toBe('Refund Processed')
    expect(c.body).toContain('₱14,500.00')
    assertClean(c.body)
  })

  it('PROMOTION uses admin-provided title/body/code and links to the catalog', () => {
    const c = buildInAppNotification({
      event: 'PROMOTION',
      context: { promoTitle: 'Mid-Season Drop', promoCode: 'CCD15', promoBody: 'Enjoy 15% off vintage compacts.' },
    })
    expect(c.title).toBe('Mid-Season Drop')
    expect(c.body).toContain('CCD15')
    expect(c.href).toBe('/products')
    assertClean(c.body)
  })

  it('REPIXL_UPDATE uses the admin free-text fallback when no context tokens', () => {
    const c = buildInAppNotification({
      event: 'REPIXL_UPDATE',
      fallbackTitle: 'Store Maintenance',
      fallbackBody: 'The store will be briefly unavailable tonight.',
    })
    expect(c.title).toBe('Store Maintenance')
    expect(c.body).toContain('unavailable')
    assertClean(c.body)
  })
})

// ─── Missing / malformed input never produces raw content ────────────────────
describe('buildInAppNotification — resilient to missing or malformed context', () => {
  it('never emits an unresolved token even with an empty context', () => {
    for (const event of ['ORDER_CONFIRMATION', 'ORDER_STATUS_CHANGE', 'RETURN_RECEIVED', 'RETURN_STATUS_CHANGE', 'REFUND_COMPLETED', 'PROMOTION', 'REPIXL_UPDATE'] as const) {
      const c = buildInAppNotification({ event })
      assertClean(c.title)
      assertClean(c.body)
      expect(c.body.length).toBeGreaterThan(0)
    }
  })

  it('ignores context values that are themselves malformed', () => {
    const c = buildInAppNotification({
      event: 'PROMOTION',
      context: { promoTitle: '{{promoTitle}}', promoBody: '{"x":1}' },
      fallbackBody: 'A clean fallback offer.',
    })
    assertClean(c.title)
    assertClean(c.body)
    expect(c.body).toContain('clean fallback')
  })

  it('falls back to a generic order body when no order number is available', () => {
    const c = buildInAppNotification({ event: 'ORDER_CONFIRMATION' })
    expect(c.body).toContain('your order')
    expect(c.href).toBeNull()
  })
})

// ─── Envelope round-trip + legacy parsing ────────────────────────────────────
describe('serialize/parse envelope', () => {
  it('round-trips content through the envelope', () => {
    const content: InAppContent = { title: 'Order Shipped', body: 'Your order #RPX-1 is on its way.', href: '/account/orders/RPX-1' }
    const stored = serializeInAppContent(content)
    expect(stored.startsWith(INAPP_ENVELOPE_PREFIX)).toBe(true)
    const parsed = parseInAppMessage(stored, 'ORDER_STATUS_CHANGE')
    expect(parsed).toEqual(content)
  })

  it('drops an unsafe href during serialization', () => {
    const stored = serializeInAppContent({ title: 'x', body: 'y', href: 'https://evil.com' as string })
    const parsed = parseInAppMessage(stored, 'PROMOTION')
    expect(parsed.href).toBeNull()
  })

  it('parses a legacy plain-text row: derives a title, sanitizes body, finds order link', () => {
    const legacy = 'Hi Alex,\n\nYour order RPX-MTR9028 has been confirmed.\n\nhttps://repxl.com/account/orders/RPX-MTR9028'
    const parsed = parseInAppMessage(legacy, 'ORDER_CONFIRMATION')
    expect(parsed.title).toBe('Order Confirmed')
    expect(parsed.body).toContain('RPX-MTR9028')
    expect(parsed.body).not.toMatch(/https?:\/\//)
    expect(parsed.href).toBe('/account/orders/RPX-MTR9028')
  })

  it('replaces a malformed legacy row with safe fallback copy', () => {
    const bad = 'Order #{{orderNumber}} has been shipped'
    const parsed = parseInAppMessage(bad, 'ORDER_STATUS_CHANGE')
    assertClean(parsed.body)
    expect(parsed.body).toBe(defaultBodyFor('ORDER_STATUS_CHANGE'))
  })

  it('handles null / empty message with event-appropriate fallback', () => {
    expect(parseInAppMessage(null, 'PROMOTION').body).toBe(defaultBodyFor('PROMOTION'))
    expect(parseInAppMessage('', 'ORDER_CONFIRMATION').body).toBe(defaultBodyFor('ORDER_CONFIRMATION'))
  })
})

// ─── looksMalformed / sanitizeInAppMessage ───────────────────────────────────
describe('malformed content detection', () => {
  it('flags handlebars, template expressions, JSON, and [object Object]', () => {
    expect(looksMalformed('Order {{orderNumber}} shipped')).toBe(true)
    expect(looksMalformed('Your order ${order.id} is confirmed')).toBe(true)
    expect(looksMalformed('{"status":"delivered"}')).toBe(true)
    expect(looksMalformed('Value: [object Object]')).toBe(true)
  })

  it('does not flag legitimate prose that merely contains braces or colons', () => {
    expect(looksMalformed('Your order is ready (see details): tracking added.')).toBe(false)
    expect(looksMalformed('We shipped 2 items today.')).toBe(false)
  })

  it('sanitize keeps clean text but strips greeting and URLs', () => {
    const out = sanitizeInAppMessage('Hi Sam, your order RPX-1 shipped. https://x.test/a', 'ORDER_STATUS_CHANGE')
    expect(out).toContain('RPX-1')
    expect(out).not.toMatch(/^hi sam/i)
    expect(out).not.toMatch(/https?:\/\//)
  })
})

// ─── Display category derivation ─────────────────────────────────────────────
describe('displayCategoryFor', () => {
  it('splits order status changes into SHIPPING vs ORDERS by status', () => {
    expect(displayCategoryFor('ORDER_STATUS_CHANGE', 'Order Shipped on its way')).toBe('SHIPPING')
    expect(displayCategoryFor('ORDER_STATUS_CHANGE', 'Order Cancelled')).toBe('ORDERS')
  })
  it('maps returns, refunds, promotions, and updates correctly', () => {
    expect(displayCategoryFor('RETURN_RECEIVED')).toBe('RETURNS')
    expect(displayCategoryFor('RETURN_STATUS_CHANGE')).toBe('RETURNS')
    expect(displayCategoryFor('REFUND_COMPLETED')).toBe('PAYMENTS')
    expect(displayCategoryFor('ORDER_CONFIRMATION')).toBe('ORDERS')
    expect(displayCategoryFor('PROMOTION')).toBe('PROMOTIONS')
    expect(displayCategoryFor('REPIXL_UPDATE')).toBe('UPDATES')
  })
})

// ─── small helpers ───────────────────────────────────────────────────────────
describe('helpers', () => {
  it('humanizeStatus turns tokens into sentence case', () => {
    expect(humanizeStatus('OUT_FOR_DELIVERY')).toBe('Out for delivery')
    expect(humanizeStatus('')).toBe('')
  })
  it('isInternalHref rejects external and protocol-relative', () => {
    expect(isInternalHref('/account/orders/RPX-1')).toBe(true)
    expect(isInternalHref('https://evil.com')).toBe(false)
    expect(isInternalHref('//evil.com')).toBe(false)
    expect(isInternalHref('')).toBe(false)
  })
})
