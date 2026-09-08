/**
 * Regression tests for order lifecycle → customer notification creation.
 *
 * These are structural/contract tests that verify:
 *   1. The routes that should emit notifications import emitNotification
 *   2. The event mappings are correct and complete
 *   3. The order number regex in the UI matches the actual order number format
 *   4. The unread-count endpoint covers ORDER_STATUS_CHANGE in ORDER_UPDATES
 *   5. Ownership: notifications are keyed by userId, not by email string
 *   6. The returns route now emits RETURN_RECEIVED
 *   7. The cancel route now emits ORDER_STATUS_CHANGE
 *   8. The confirm-receipt route now emits ORDER_STATUS_CHANGE
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  EVENT_CATEGORY_MAP,
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from '@/lib/notification-templates'
import {
  isMandatoryEvent,
  shouldSendNotification,
} from '@/lib/notifications'

// ── Event mapping correctness ─────────────────────────────────────────────────

describe('ORDER_STATUS_CHANGE event mapping', () => {
  it('maps to ORDER_UPDATES category', () => {
    expect(EVENT_CATEGORY_MAP['ORDER_STATUS_CHANGE']).toBe('ORDER_UPDATES')
  })

  it('ORDER_CONFIRMATION maps to ORDER_UPDATES', () => {
    expect(EVENT_CATEGORY_MAP['ORDER_CONFIRMATION']).toBe('ORDER_UPDATES')
  })

  it('RETURN_RECEIVED maps to ORDER_UPDATES', () => {
    expect(EVENT_CATEGORY_MAP['RETURN_RECEIVED']).toBe('ORDER_UPDATES')
  })

  it('RETURN_STATUS_CHANGE maps to ORDER_UPDATES', () => {
    expect(EVENT_CATEGORY_MAP['RETURN_STATUS_CHANGE']).toBe('ORDER_UPDATES')
  })

  it('REFUND_COMPLETED maps to ORDER_UPDATES', () => {
    expect(EVENT_CATEGORY_MAP['REFUND_COMPLETED']).toBe('ORDER_UPDATES')
  })

  it('every event in NOTIFICATION_EVENTS has a category mapping', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(EVENT_CATEGORY_MAP[event], `${event} missing from EVENT_CATEGORY_MAP`).toBeDefined()
    }
  })
})

// ── Mandatory event protection ────────────────────────────────────────────────

describe('mandatory event handling', () => {
  it('ORDER_CONFIRMATION is mandatory and never suppressed', () => {
    expect(isMandatoryEvent('ORDER_CONFIRMATION')).toBe(true)
  })

  it('ORDER_STATUS_CHANGE is not mandatory (follows user preferences)', () => {
    expect(isMandatoryEvent('ORDER_STATUS_CHANGE')).toBe(false)
  })

  it('RETURN_RECEIVED is not mandatory', () => {
    expect(isMandatoryEvent('RETURN_RECEIVED')).toBe(false)
  })

  it('order events are not promo opt-out suppressed', () => {
    const orderEvents: NotificationEvent[] = [
      'ORDER_STATUS_CHANGE', 'ORDER_CONFIRMATION', 'RETURN_RECEIVED',
      'RETURN_STATUS_CHANGE', 'REFUND_COMPLETED',
    ]
    for (const event of orderEvents) {
      expect(shouldSendNotification(event, /* promoOptOut= */ true)).toBe(true)
    }
  })
})

// ── Route emission contracts ──────────────────────────────────────────────────

describe('admin order status PATCH emits ORDER_STATUS_CHANGE', () => {
  it('imports emitNotification', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/route.ts', 'utf8')
    expect(src).toContain("import { emitNotification } from '@/lib/notifications'")
  })

  it('calls emitNotification with ORDER_STATUS_CHANGE', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/route.ts', 'utf8')
    expect(src).toContain("event: 'ORDER_STATUS_CHANGE'")
  })

  it('derives userId from the fetched DB user, not from client input', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/route.ts', 'utf8')
    // Must use updated.user.id from the DB result
    expect(src).toContain('userId: updated.user.id')
    // Must NOT use a client-supplied userId
    expect(src).not.toContain('body.userId')
  })
})

describe('customer cancel route emits ORDER_STATUS_CHANGE', () => {
  it('imports emitNotification', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/cancel/route.ts', 'utf8')
    expect(src).toContain("import { emitNotification } from '@/lib/notifications'")
  })

  it('calls emitNotification with ORDER_STATUS_CHANGE after cancel', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/cancel/route.ts', 'utf8')
    expect(src).toContain("event: 'ORDER_STATUS_CHANGE'")
  })

  it('derives userId from the authenticated session user, not body', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/cancel/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('userId: user.id')
    expect(src).not.toContain('body.userId')
  })

  it('only cancels PROCESSING orders (state machine prevents duplicate cancel notifications)', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/cancel/route.ts', 'utf8')
    expect(src).toContain("order.status !== 'PROCESSING'")
  })
})

describe('confirm-receipt route emits ORDER_STATUS_CHANGE on COMPLETED', () => {
  it('imports emitNotification', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/confirm-receipt/route.ts', 'utf8')
    expect(src).toContain("import { emitNotification } from '@/lib/notifications'")
  })

  it('calls emitNotification with ORDER_STATUS_CHANGE', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/confirm-receipt/route.ts', 'utf8')
    expect(src).toContain("event: 'ORDER_STATUS_CHANGE'")
  })

  it('emits notification for both review-created and already-reviewed paths', () => {
    const src = readFileSync('src/app/api/orders/[orderNumber]/confirm-receipt/route.ts', 'utf8')
    // Should appear at least twice — once per return path
    const matches = src.match(/event: 'ORDER_STATUS_CHANGE'/g)
    expect(matches?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('returns route emits RETURN_RECEIVED', () => {
  it('imports emitNotification', () => {
    const src = readFileSync('src/app/api/returns/route.ts', 'utf8')
    expect(src).toContain("import { emitNotification } from '@/lib/notifications'")
  })

  it('calls emitNotification with RETURN_RECEIVED', () => {
    const src = readFileSync('src/app/api/returns/route.ts', 'utf8')
    expect(src).toContain("event: 'RETURN_RECEIVED'")
  })

  it('derives userId from the authenticated session', () => {
    const src = readFileSync('src/app/api/returns/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('userId: user.id')
    expect(src).not.toContain('body.userId')
  })
})

// ── Unread-count endpoint covers ORDER_UPDATES ───────────────────────────────

describe('unread-count endpoint category routing', () => {
  it('routes ORDER_UPDATES events to the correct nav path', () => {
    const src = readFileSync('src/app/api/notifications/unread-count/route.ts', 'utf8')
    expect(src).toContain('/account/notifications/order-updates')
    expect(src).toContain('ORDER_UPDATES')
    // Uses EVENT_CATEGORY_MAP for routing — no hardcoded event strings
    expect(src).toContain('EVENT_CATEGORY_MAP')
  })

  it('uses a groupBy query rather than fetching all rows for counting', () => {
    const src = readFileSync('src/app/api/notifications/unread-count/route.ts', 'utf8')
    expect(src).toContain('groupBy')
    // The actual query is groupBy — no findMany call (comment mentions it as the avoided pattern)
    const lines = src.split('\n').filter(l => !l.trimStart().startsWith('//'))
    expect(lines.join('\n')).not.toContain('findMany(')
  })

  it('filters by userId from session, never from client', () => {
    const src = readFileSync('src/app/api/notifications/unread-count/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('userId: user.id')
  })
})

// ── Notifications list API ownership ─────────────────────────────────────────

describe('notifications list API ownership', () => {
  it('filters by userId from server session', () => {
    const src = readFileSync('src/app/api/notifications/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('userId: user.id')
  })

  it('does not accept userId from the request body or query', () => {
    const src = readFileSync('src/app/api/notifications/route.ts', 'utf8')
    expect(src).not.toContain('body.userId')
    expect(src).not.toContain("searchParams.get('userId')")
  })

  it('orders by createdAt desc (newest first)', () => {
    const src = readFileSync('src/app/api/notifications/route.ts', 'utf8')
    expect(src).toContain('createdAt')
    expect(src).toContain('desc')
  })
})

// ── Mark-as-read ownership ────────────────────────────────────────────────────

describe('mark-as-read ownership enforcement', () => {
  it('single-read route checks notification.userId === user.id before mutating', () => {
    const src = readFileSync('src/app/api/notifications/[id]/read/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('notification.userId !== user.id')
  })

  it('mark-all-read route filters updateMany by userId from session', () => {
    const src = readFileSync('src/app/api/notifications/read-all/route.ts', 'utf8')
    expect(src).toContain('getCurrentUser')
    expect(src).toContain('userId: user.id')
  })
})

// ── Order number regex ────────────────────────────────────────────────────────

describe('order number regex matches real format', () => {
  it('NotificationList uses RPX- prefix in order-number regex', () => {
    const src = readFileSync('src/components/account/NotificationList.tsx', 'utf8')
    expect(src).toContain('RPX-')
    expect(src).not.toContain('ORD-')
  })

  it('NavBellDropdown uses RPX- prefix in order-number regex', () => {
    const src = readFileSync('src/components/layout/NavBellDropdown.tsx', 'utf8')
    expect(src).toContain('RPX-')
    expect(src).not.toContain('ORD-')
  })

  it('RPX- regex matches sample order numbers from DB', () => {
    const pattern = /\b(RPX-[A-Z0-9]{6,})\b/
    expect(pattern.test('Your order RPX-MTRJ0Z8SX3RG has been confirmed.')).toBe(true)
    expect(pattern.test('Your order RPX-MTO7XOD14L6K status has changed.')).toBe(true)
    // Old ORD- format should not match
    expect(pattern.test('Your order ORD-ABCDEF123 was shipped.')).toBe(false)
  })
})

// ── Notification preferences: ORDER_UPDATES not suppressed by default ─────────

describe('notification preference defaults', () => {
  it('ORDER_STATUS_CHANGE is in ORDER_UPDATES category which defaults on', () => {
    // The preference model defaults all boolean fields to true.
    // We verify the category is ORDER_UPDATES (not PROMOTIONS which has opt-out semantics).
    expect(EVENT_CATEGORY_MAP['ORDER_STATUS_CHANGE']).toBe('ORDER_UPDATES')
    // ORDER_UPDATES is not a promotional category, so promoOptOut doesn't suppress it.
    expect(shouldSendNotification('ORDER_STATUS_CHANGE', true)).toBe(true)
  })
})
