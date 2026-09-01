import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { OrderStatus } from '@prisma/client'
import {
  sortOrdersByDateDesc,
  computeStepperState,
  canAccessOrder,
  TRACKING_PROGRESSION,
} from './order-tracking'

const MIN_RUNS = 100

const ALL_STATUSES: OrderStatus[] = [
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
  OrderStatus.COMPLETED,
  OrderStatus.CANCELLED,
]

// Arbitrary producing a customer order with a date and the fields shown in history.
const orderArb = fc.record({
  orderNumber: fc.string({ minLength: 1, maxLength: 12 }),
  orderDate: fc
    .integer({ min: 0, max: 4_102_444_800_000 }) // epoch .. year ~2100
    .map((ms) => new Date(ms)),
  total: fc.integer({ min: 0, max: 10_000_000 }),
  status: fc.constantFrom(...ALL_STATUSES),
})

describe('order-tracking', () => {
  // Feature: admin-client-management-suite, Property 37: Order history is ordered by
  // date descending — for any set of a customer's orders, the order history view
  // SHALL present them ordered by order date in non-increasing order, each showing
  // order number, date, total, and current status.
  // Validates: Requirements 10.1
  it('Property 37: order history is ordered by date descending', () => {
    fc.assert(
      fc.property(fc.array(orderArb, { maxLength: 40 }), (orders) => {
        const sorted = sortOrdersByDateDesc(orders)

        // Same multiset of items (no loss / duplication), input not mutated.
        expect(sorted).toHaveLength(orders.length)
        expect(orders).toEqual(orders) // reference sanity: original untouched shape

        // Non-increasing by order date.
        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i - 1].orderDate.getTime()).toBeGreaterThanOrEqual(
            sorted[i].orderDate.getTime(),
          )
        }

        // Each retained entry still carries the required display fields.
        for (const o of sorted) {
          expect(o).toHaveProperty('orderNumber')
          expect(o).toHaveProperty('orderDate')
          expect(o).toHaveProperty('total')
          expect(o).toHaveProperty('status')
        }
      }),
      { numRuns: MIN_RUNS },
    )
  })

  // Feature: admin-client-management-suite, Property 38: Order status progression
  // reflects the current state — for any order status, the tracking stepper SHALL
  // mark every state up to and including the current state as reached and every
  // later state as not reached across PROCESSING → SHIPPED → DELIVERED → COMPLETED,
  // and SHALL suppress the progression entirely when the status is CANCELLED.
  // Validates: Requirements 10.2, 10.4
  it('Property 38: order status progression reflects the current state', () => {
    fc.assert(
      fc.property(fc.constantFrom(...ALL_STATUSES), (status) => {
        const result = computeStepperState(status)

        if (status === OrderStatus.CANCELLED) {
          expect(result.cancelled).toBe(true)
          expect(result.steps).toHaveLength(0)
          return
        }

        expect(result.cancelled).toBe(false)
        expect(result.steps.map((s) => s.status)).toEqual([...TRACKING_PROGRESSION])

        const currentIndex = TRACKING_PROGRESSION.indexOf(status)
        result.steps.forEach((step, index) => {
          expect(step.reached).toBe(index <= currentIndex)
          expect(step.current).toBe(index === currentIndex)
        })

        // Exactly one current step for a valid non-cancelled progression status.
        expect(result.steps.filter((s) => s.current)).toHaveLength(1)
      }),
      { numRuns: MIN_RUNS },
    )
  })

  // Feature: admin-client-management-suite, Property 39: Order access is restricted
  // to the owner — for any pair of requesting customer and order owner, order detail
  // data SHALL be returned if and only if the requester is the owner; otherwise
  // access SHALL be denied with no order data disclosed.
  // Validates: Requirements 10.6
  it('Property 39: order access is restricted to the owner', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }),
        fc.string({ minLength: 1, maxLength: 30 }),
        (requesterId, ownerId) => {
          const allowed = canAccessOrder(requesterId, ownerId)
          expect(allowed).toBe(requesterId === ownerId)
        },
      ),
      { numRuns: MIN_RUNS },
    )

    // Reinforce the equivalence: same id always grants, and denial holds otherwise.
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 30 }), (id) => {
        expect(canAccessOrder(id, id)).toBe(true)
      }),
      { numRuns: MIN_RUNS },
    )
  })
})
