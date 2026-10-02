import { describe, expect, it } from 'vitest'
import {
  calculateReturnQuote,
  getReturnStage,
  getReturnTimeline,
} from './return-workflow'

const order = {
  total: 190,
  discount: 20,
  shippingCost: 10,
  items: [
    { id: 'a', price: 100, quantity: 1 },
    { id: 'b', price: 50, quantity: 2 },
  ],
}
describe('return monetary and lifecycle rules', () => {
  it('refunds selected item prices after their proportional discount, excluding shipping for a subset', () => {
    expect(
      calculateReturnQuote(order, [{ orderItemId: 'a', quantity: 1 }])
    ).toEqual({
      itemsAmount: 90,
      shippingAmount: 0,
      maxAmount: 90,
      includesAllItems: false,
    })
  })
  it('allows shipping only for a whole-order return and never exceeds the paid total', () => {
    expect(calculateReturnQuote(order, [])).toEqual({
      itemsAmount: 180,
      shippingAmount: 10,
      maxAmount: 190,
      includesAllItems: true,
    })
  })
  it('handles individual quantities and centavo rounding', () => {
    expect(
      calculateReturnQuote(order, [{ orderItemId: 'b', quantity: 1 }])
        .itemsAmount
    ).toBe(45)
    const result = calculateReturnQuote(
      {
        total: 0.99,
        discount: 0.01,
        shippingCost: 0,
        items: [
          { id: 'a', price: 0.33, quantity: 1 },
          { id: 'b', price: 0.67, quantity: 1 },
        ],
      },
      [{ orderItemId: 'a', quantity: 1 }]
    )
    expect(result.itemsAmount).toBe(0.33)
  })
  it.each([
    [{ orderItemId: 'foreign', quantity: 1 }],
    [{ orderItemId: 'a', quantity: 2 }],
    [{ orderItemId: 'a', quantity: 0 }],
    [{ orderItemId: 'a', quantity: 0.5 }],
    [
      { orderItemId: 'a', quantity: 1 },
      { orderItemId: 'a', quantity: 1 },
    ],
  ])('rejects invalid or duplicate selections %j', (...entries) => {
    expect(() => calculateReturnQuote(order, entries)).toThrow(
      'Invalid returned item'
    )
  })
  it.each([
    [{ status: 'REQUESTED' }, 'Request received'],
    [{ status: 'UNDER_REVIEW' }, 'Under review'],
    [{ status: 'APPROVED' }, 'Return approved'],
    [{ status: 'APPROVED', shippedAt: new Date() }, 'Return on its way'],
    [{ status: 'APPROVED', receivedAt: new Date() }, 'Items received'],
    [{ status: 'APPROVED', inspectedAt: new Date() }, 'Inspection complete'],
    [
      {
        status: 'APPROVED',
        refundStartedAt: new Date(),
        refundStatus: 'pending',
      },
      'Refund processing',
    ],
    [
      {
        status: 'APPROVED',
        refundStartedAt: new Date(),
        refundStatus: 'failed',
      },
      'Refund needs attention',
    ],
    [{ status: 'REFUNDED' }, 'Refund completed'],
    [{ status: 'REJECTED' }, 'Request declined'],
  ])('shows truthful stage for %j', (input, expected) => {
    expect(getReturnStage({ createdAt: new Date(), ...input })).toBe(expected)
  })
  it('does not fabricate milestone dates for a new or declined return', () => {
    const timeline = getReturnTimeline({
      status: 'REQUESTED',
      createdAt: '2026-10-02',
    })
    expect(timeline.filter((step) => step.date)).toHaveLength(1)
  })
})
