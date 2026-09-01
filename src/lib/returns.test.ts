import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { OrderStatus, PaymentStatus, ReturnStatus } from '@prisma/client'
import {
  RETURN_WINDOW_DAYS,
  REASON_MIN_LENGTH,
  REASON_MAX_LENGTH,
  isWithinReturnWindow,
  canTransition,
  isRefundEligible,
  hasActiveRequest,
  isValidRejectionReason,
  validateReturnSubmission,
} from './returns'

const NUM_RUNS = 100
const MS_PER_DAY = 24 * 60 * 60 * 1000

const orderStatusArb = fc.constantFrom(...Object.values(OrderStatus))
const returnStatusArb = fc.constantFrom(...Object.values(ReturnStatus))
const paymentStatusArb = fc.constantFrom(...Object.values(PaymentStatus))

// Reference (independent) allowed-transition set for verification.
const ALLOWED_PAIRS = new Set<string>([
  `${ReturnStatus.REQUESTED}->${ReturnStatus.UNDER_REVIEW}`,
  `${ReturnStatus.REQUESTED}->${ReturnStatus.APPROVED}`,
  `${ReturnStatus.REQUESTED}->${ReturnStatus.REJECTED}`,
  `${ReturnStatus.UNDER_REVIEW}->${ReturnStatus.APPROVED}`,
  `${ReturnStatus.UNDER_REVIEW}->${ReturnStatus.REJECTED}`,
  `${ReturnStatus.APPROVED}->${ReturnStatus.REFUNDED}`,
])

describe('returns workflow logic', () => {
  // Feature: admin-client-management-suite, Property 7: Return window is enforced by status and date
  it('Property 7: return window is true iff status is DELIVERED/COMPLETED and the relevant date is within the preceding 30 days', () => {
    fc.assert(
      fc.property(
        orderStatusArb,
        // offset in days for deliveredAt / completedAt relative to `now`
        // (positive = in the past). Range spans well beyond the 30-day window.
        fc.double({ min: -60, max: 60, noNaN: true }),
        fc.double({ min: -60, max: 60, noNaN: true }),
        fc.date({ min: new Date('2020-01-01'), max: new Date('2035-01-01') }),
        fc.boolean(),
        fc.boolean(),
        (status, deliveredOffsetDays, completedOffsetDays, now, deliveredNull, completedNull) => {
          const deliveredAt = deliveredNull
            ? null
            : new Date(now.getTime() - deliveredOffsetDays * MS_PER_DAY)
          const completedAt = completedNull
            ? null
            : new Date(now.getTime() - completedOffsetDays * MS_PER_DAY)

          const order = { status, deliveredAt, completedAt }
          const actual = isWithinReturnWindow(order, now)

          let relevant: Date | null
          if (status === OrderStatus.DELIVERED) relevant = deliveredAt
          else if (status === OrderStatus.COMPLETED) relevant = completedAt
          else relevant = null

          let expected = false
          if (relevant) {
            const diff = now.getTime() - relevant.getTime()
            expected = diff >= 0 && diff <= RETURN_WINDOW_DAYS * MS_PER_DAY
          }

          expect(actual).toBe(expected)
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 8: Valid return submissions create a linked REQUESTED request
  it('Property 8: a submission with >=1 item and reason length 10-1000 produces a REQUESTED request with exactly the selected items and reason', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        fc.array(fc.string(), { minLength: 1, maxLength: 12 }),
        fc.string({ minLength: REASON_MIN_LENGTH, maxLength: REASON_MAX_LENGTH }),
        (orderId, userId, selectedItemIds, reason) => {
          const result = validateReturnSubmission({ orderId, userId, selectedItemIds, reason })

          expect(result.ok).toBe(true)
          if (result.ok) {
            expect(result.request.status).toBe(ReturnStatus.REQUESTED)
            expect(result.request.orderId).toBe(orderId)
            expect(result.request.userId).toBe(userId)
            expect(result.request.selectedItemIds).toEqual(selectedItemIds)
            expect(result.request.reason).toBe(reason)
          }
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 9: Invalid return submissions are rejected with offending fields
  it('Property 9: a submission with zero items or an out-of-range reason is rejected and reports each offending field', () => {
    const invalidReasonArb = fc.oneof(
      fc.string({ maxLength: REASON_MIN_LENGTH - 1 }),
      fc.string({ minLength: REASON_MAX_LENGTH + 1, maxLength: REASON_MAX_LENGTH + 50 })
    )
    const validReasonArb = fc.string({ minLength: REASON_MIN_LENGTH, maxLength: REASON_MAX_LENGTH })

    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.array(fc.string(), { minLength: 1, maxLength: 8 }),
        invalidReasonArb,
        validReasonArb,
        (itemsInvalid, reasonInvalid, validItems, badReason, goodReason) => {
          // Ensure at least one field is invalid.
          if (!itemsInvalid && !reasonInvalid) {
            itemsInvalid = true
          }

          const selectedItemIds = itemsInvalid ? [] : validItems
          const reason = reasonInvalid ? badReason : goodReason

          const result = validateReturnSubmission({
            orderId: 'order-1',
            userId: 'user-1',
            selectedItemIds,
            reason,
          })

          expect(result.ok).toBe(false)
          if (!result.ok) {
            const fields = new Set(result.errors.map((e) => e.field))
            expect(fields.has('items')).toBe(itemsInvalid)
            expect(fields.has('reason')).toBe(reasonInvalid)
          }
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 10: At most one active return request per order
  it('Property 10: hasActiveRequest is true iff the set contains REQUESTED or UNDER_REVIEW', () => {
    fc.assert(
      fc.property(fc.array(returnStatusArb, { maxLength: 10 }), (statuses) => {
        const expected = statuses.some(
          (s) => s === ReturnStatus.REQUESTED || s === ReturnStatus.UNDER_REVIEW
        )
        expect(hasActiveRequest(statuses)).toBe(expected)
      }),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 11: Return status transitions follow the allowed table
  it('Property 11: canTransition is true only for the six allowed (from,to) transitions', () => {
    fc.assert(
      fc.property(returnStatusArb, returnStatusArb, (from, to) => {
        const expected = ALLOWED_PAIRS.has(`${from}->${to}`)
        expect(canTransition(from, to)).toBe(expected)
      }),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 12: Whitespace-only rejection reasons are refused
  it('Property 12: a rejection reason consisting solely of whitespace is refused', () => {
    fc.assert(
      fc.property(
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r', '\f', '\v'), { maxLength: 50 }),
        (whitespaceReason) => {
          expect(isValidRejectionReason(whitespaceReason)).toBe(false)
        }
      ),
      { numRuns: NUM_RUNS }
    )
  })

  // Feature: admin-client-management-suite, Property 13: Refund eligibility requires APPROVED and PAID
  it('Property 13: isRefundEligible is true iff return status is APPROVED and payment status is PAID', () => {
    fc.assert(
      fc.property(returnStatusArb, paymentStatusArb, (returnStatus, paymentStatus) => {
        const expected =
          returnStatus === ReturnStatus.APPROVED && paymentStatus === PaymentStatus.PAID
        expect(isRefundEligible(returnStatus, paymentStatus)).toBe(expected)
      }),
      { numRuns: NUM_RUNS }
    )
  })
})
