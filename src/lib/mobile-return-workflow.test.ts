import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import * as web from './return-workflow'
import * as mobile from '../../react-native/src/utils/return-workflow'
import {
  canRecordReturnShipment,
  validateReturnShipment,
  type ReturnRequest,
} from '../../react-native/src/utils/returns'

const base: ReturnRequest = {
  id: 'return1',
  status: 'APPROVED',
  reason: 'Other',
  rejectionReason: null,
  refundId: null,
  createdAt: '2026-10-02',
  updatedAt: '2026-10-02',
}
describe('mobile expanded return workflow', () => {
  it('keeps refund amounts aligned with the web for prices, quantities, discounts and shipping', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: 1, max: 100000 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 10000 }),
        (a, b, quantity, discountPercent, shipping) => {
          const subtotal = a + b * quantity
          const discount = Math.round((subtotal * discountPercent) / 100)
          const order = {
            total: (subtotal - discount + shipping) / 100,
            discount: discount / 100,
            shippingCost: shipping / 100,
            items: [
              { id: 'a', price: a / 100, quantity: 1 },
              { id: 'b', price: b / 100, quantity },
            ],
          }
          if (order.total <= 0) return
          for (const selected of [
            [],
            [{ orderItemId: 'a', quantity: 1 }],
            [{ orderItemId: 'b', quantity: 1 }],
          ])
            expect(mobile.calculateReturnQuote(order, selected)).toEqual(
              web.calculateReturnQuote(order, selected)
            )
        }
      )
    )
  })
  it.each([
    { status: 'REQUESTED' },
    { status: 'UNDER_REVIEW' },
    { status: 'APPROVED' },
    { status: 'APPROVED', shippedAt: '2026-10-03' },
    { status: 'APPROVED', receivedAt: '2026-10-04' },
    { status: 'APPROVED', inspectedAt: '2026-10-05' },
    {
      status: 'APPROVED',
      refundStartedAt: '2026-10-06',
      refundStatus: 'pending',
    },
    {
      status: 'APPROVED',
      refundStartedAt: '2026-10-06',
      refundStatus: 'unknown',
    },
    { status: 'APPROVED', refundStatus: 'failed' },
    { status: 'REFUNDED' },
    { status: 'REJECTED' },
  ])('matches web stage and actual milestone dates for %j', (input) => {
    const request = { ...base, ...input }
    expect(mobile.getReturnStage(request)).toBe(web.getReturnStage(request))
    expect(mobile.getReturnTimeline(request)).toEqual(
      web.getReturnTimeline(request)
    )
    if (request.status !== 'REFUNDED')
      expect(mobile.getReturnTimeline(request).at(-1)?.date).toBeFalsy()
  })
  it('allows recording and correcting tracking before receipt only', () => {
    expect(canRecordReturnShipment(base)).toBe(true)
    expect(canRecordReturnShipment({ ...base, shippedAt: '2026-10-03' })).toBe(
      true
    )
    expect(canRecordReturnShipment({ ...base, receivedAt: '2026-10-04' })).toBe(
      false
    )
    expect(
      canRecordReturnShipment({ ...base, refundStartedAt: '2026-10-04' })
    ).toBe(false)
    expect(canRecordReturnShipment({ ...base, status: 'REQUESTED' })).toBe(
      false
    )
  })
  it('validates shipment fields against backend length limits after trimming', () => {
    const input = {
      returnRequestId: 'return1',
      returnCarrier: ' Courier ',
      returnTrackingNumber: ' TRACK123 ',
    }
    expect(validateReturnShipment(input)).toBeNull()
    for (const returnCarrier of [' ', 'a', 'a'.repeat(101)])
      expect(validateReturnShipment({ ...input, returnCarrier })).toContain(
        'carrier'
      )
    for (const returnTrackingNumber of [' ', 'ab', 'a'.repeat(151)])
      expect(
        validateReturnShipment({ ...input, returnTrackingNumber })
      ).toContain('tracking')
  })
})
