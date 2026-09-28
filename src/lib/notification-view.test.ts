import { describe, it, expect } from 'vitest'
import { toNotificationView, toNotificationViews } from './notification-view'
import { serializeInAppContent, buildInAppNotification } from './notification-inapp'

function row(overrides: Partial<Parameters<typeof toNotificationView>[0]> = {}) {
  return {
    id: 'n1',
    event: 'ORDER_STATUS_CHANGE',
    message: serializeInAppContent(
      buildInAppNotification({ event: 'ORDER_STATUS_CHANGE', context: { orderNumber: 'RPX-1', status: 'SHIPPED' } })
    ),
    isRead: false,
    createdAt: new Date('2026-09-01T00:00:00Z'),
    ...overrides,
  }
}

describe('toNotificationView — DB row → display DTO', () => {
  it('produces title/body/href/category/icon from a modern envelope', () => {
    const v = toNotificationView(row())
    expect(v.title).toBe('Order Shipped')
    expect(v.body).toContain('#RPX-1')
    expect(v.href).toBe('/account/orders/RPX-1')
    expect(v.category).toBe('SHIPPING')
    expect(v.icon).toBe('shipping')
    expect(v.isRead).toBe(false)
    expect(typeof v.createdAt).toBe('string')
  })

  it('sanitizes a legacy malformed row into safe copy, never raw tokens', () => {
    const v = toNotificationView(row({ message: 'Order #{{orderNumber}} has been shipped', event: 'ORDER_STATUS_CHANGE' }))
    expect(v.body).not.toMatch(/\{\{|\}\}/)
    expect(v.title).toBe('Order Update')
  })

  it('derives an order link from a clean legacy plain-text row', () => {
    const v = toNotificationView(row({ message: 'Your order RPX-MTR9028 has been confirmed.', event: 'ORDER_CONFIRMATION' }))
    expect(v.href).toBe('/account/orders/RPX-MTR9028')
    expect(v.category).toBe('ORDERS')
  })

  it('maps a promotion row to the PROMOTIONS category and catalog link', () => {
    const v = toNotificationView(
      row({
        event: 'PROMOTION',
        message: serializeInAppContent(buildInAppNotification({ event: 'PROMOTION', context: { promoTitle: 'Sale', promoBody: 'Save now.' } })),
      })
    )
    expect(v.category).toBe('PROMOTIONS')
    expect(v.icon).toBe('promotion')
    expect(v.href).toBe('/products')
  })

  it('maps a list of rows', () => {
    const views = toNotificationViews([row(), row({ id: 'n2' })])
    expect(views).toHaveLength(2)
    expect(views[0].id).toBe('n1')
  })
})
