import { describe, it, expect } from 'vitest'
import { fc, test as fcTest } from '@fast-check/vitest'
import { NOTIFICATION_EVENTS, type NotificationEvent } from './notification-templates'
import {
  MAX_DISPLAY_MESSAGE_LENGTH,
  MAX_DISPLAY_UNREAD,
  displayUnreadCount,
  isInAppRetained,
  isPromotionalEvent,
  markAllNotificationsRead,
  markNotificationRead,
  shouldSendNotification,
  shouldSuppressForDisabledTemplate,
  truncateForDisplay,
  unreadCount,
  type ReadableNotification,
} from './notifications'

const NUM_RUNS = 200

/** Arbitrary picking any defined notification event. */
const eventArb: fc.Arbitrary<NotificationEvent> = fc.constantFrom(
  ...NOTIFICATION_EVENTS
)

/**
 * Build a notification list from an array of read/unread flags, assigning a
 * unique id per index so read-state transforms are unambiguous.
 */
function buildList(flags: boolean[]): ReadableNotification[] {
  return flags.map((isRead, i) => ({ id: `n${i}`, isRead }))
}

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 30: Disabled templates
// suppress notifications — for an event whose template is disabled, no
// notification is created and no email sent (the suppression predicate is
// true iff the template is disabled).
// Validates: Requirements 8.6
// ---------------------------------------------------------------------------
describe('Property 30: Disabled templates suppress notifications', () => {
  fcTest.prop({ isEnabled: fc.boolean() })(
    'suppresses if and only if the template is disabled',
    ({ isEnabled }) => {
      expect(shouldSuppressForDisabledTemplate(isEnabled)).toBe(!isEnabled)
    },
    { numRuns: NUM_RUNS }
  )

  it('disabled → suppressed, enabled → not suppressed', () => {
    expect(shouldSuppressForDisabledTemplate(false)).toBe(true)
    expect(shouldSuppressForDisabledTemplate(true)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 31: Displayed notification
// message is bounded — the message presented in the Notification Center is at
// most 500 characters.
// Validates: Requirements 9.3
// ---------------------------------------------------------------------------
describe('Property 31: Displayed notification message is bounded', () => {
  fcTest.prop({ message: fc.string({ maxLength: 2000 }) })(
    'truncated message never exceeds the 500-char display bound',
    ({ message }) => {
      const shown = truncateForDisplay(message)
      expect(shown.length).toBeLessThanOrEqual(MAX_DISPLAY_MESSAGE_LENGTH)
      // Messages already within bounds are returned unchanged.
      if (message.length <= MAX_DISPLAY_MESSAGE_LENGTH) {
        expect(shown).toBe(message)
      } else {
        expect(shown).toBe(message.slice(0, MAX_DISPLAY_MESSAGE_LENGTH))
      }
    },
    { numRuns: NUM_RUNS }
  )

  fcTest.prop({
    message: fc.string({ maxLength: 500 }),
    max: fc.integer({ min: 0, max: 500 }),
  })(
    'respects a custom max bound',
    ({ message, max }) => {
      expect(truncateForDisplay(message, max).length).toBeLessThanOrEqual(max)
    },
    { numRuns: NUM_RUNS }
  )
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 32: Unread count display
// rule — displayUnreadCount returns the decimal string for 0–99 and "99+"
// when the count exceeds 99.
// Validates: Requirements 9.4
// ---------------------------------------------------------------------------
describe('Property 32: Unread count display rule', () => {
  fcTest.prop({ count: fc.integer({ min: 0, max: 100000 }) })(
    'shows exact count for 0–99 and "99+" beyond 99',
    ({ count }) => {
      const shown = displayUnreadCount(count)
      if (count > MAX_DISPLAY_UNREAD) {
        expect(shown).toBe('99+')
      } else {
        expect(shown).toBe(String(count))
      }
    },
    { numRuns: NUM_RUNS }
  )

  it('handles exact boundaries and non-normal inputs', () => {
    expect(displayUnreadCount(0)).toBe('0')
    expect(displayUnreadCount(99)).toBe('99')
    expect(displayUnreadCount(100)).toBe('99+')
    expect(displayUnreadCount(-5)).toBe('0')
    expect(displayUnreadCount(3.7)).toBe('3')
  })
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 33: Marking a notification
// read decrements the unread count by one — marking a single unread
// notification sets it to read and reduces the unread count by exactly one.
// Validates: Requirements 9.5
// ---------------------------------------------------------------------------
describe('Property 33: Marking a notification read decrements the unread count by one', () => {
  fcTest.prop({
    flags: fc
      .array(fc.boolean(), { minLength: 1, maxLength: 40 })
      // Ensure at least one unread notification exists to mark.
      .map((arr) => (arr.some((r) => !r) ? arr : [...arr, false])),
    pick: fc.nat(),
  })(
    'sets the chosen unread notification to read and decrements unread by exactly one',
    ({ flags, pick }) => {
      const list = buildList(flags)
      const before = unreadCount(list)

      const unreadIds = list.filter((n) => !n.isRead).map((n) => n.id)
      const targetId = unreadIds[pick % unreadIds.length]

      const after = markNotificationRead(list, targetId)

      expect(after.find((n) => n.id === targetId)?.isRead).toBe(true)
      expect(unreadCount(after)).toBe(before - 1)
      // Original list is not mutated.
      expect(unreadCount(list)).toBe(before)
    },
    { numRuns: NUM_RUNS }
  )

  it('is a no-op when the target is already read or absent', () => {
    const list = buildList([true, true])
    expect(unreadCount(markNotificationRead(list, 'n0'))).toBe(0)
    expect(unreadCount(markNotificationRead(list, 'missing'))).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 34: Mark-all-read clears
// unread and is idempotent — marking all as read leaves no unread and applying
// again produces the same result.
// Validates: Requirements 9.6
// ---------------------------------------------------------------------------
describe('Property 34: Mark-all-read clears unread and is idempotent', () => {
  fcTest.prop({ flags: fc.array(fc.boolean(), { maxLength: 40 }) })(
    'clears every unread notification and is idempotent',
    ({ flags }) => {
      const list = buildList(flags)

      const once = markAllNotificationsRead(list)
      expect(unreadCount(once)).toBe(0)
      expect(once.every((n) => n.isRead)).toBe(true)

      const twice = markAllNotificationsRead(once)
      expect(unreadCount(twice)).toBe(0)
      expect(twice.map((n) => n.isRead)).toEqual(once.map((n) => n.isRead))

      // Original list is not mutated.
      expect(unreadCount(list)).toBe(flags.filter((r) => !r).length)
    },
    { numRuns: NUM_RUNS }
  )
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 35: In-app notification is
// retained regardless of email outcome — the in-app notification exists and is
// retained whether email delivery succeeds or fails.
// Validates: Requirements 9.7
// ---------------------------------------------------------------------------
describe('Property 35: In-app notification is retained regardless of email outcome', () => {
  fcTest.prop({ emailSucceeded: fc.boolean() })(
    'in-app notification is always retained',
    ({ emailSucceeded }) => {
      expect(isInAppRetained(emailSucceeded)).toBe(true)
    },
    { numRuns: NUM_RUNS }
  )
})

// ---------------------------------------------------------------------------
// Feature: admin-client-management-suite, Property 36: Promotional opt-out
// excludes only promotions — a promotional notification is excluded iff the
// customer opted out, while order-related notifications are always created.
// Validates: Requirements 9.9
// ---------------------------------------------------------------------------
describe('Property 36: Promotional opt-out excludes only promotions', () => {
  fcTest.prop({ event: eventArb, promoOptOut: fc.boolean() })(
    'promotions gated by opt-out; order-related always sent',
    ({ event, promoOptOut }) => {
      const send = shouldSendNotification(event, promoOptOut)
      if (isPromotionalEvent(event)) {
        expect(send).toBe(!promoOptOut)
      } else {
        expect(send).toBe(true)
      }
    },
    { numRuns: NUM_RUNS }
  )

  it('only PROMOTION is promotional; opt-out never blocks order events', () => {
    expect(isPromotionalEvent('PROMOTION')).toBe(true)
    expect(shouldSendNotification('PROMOTION', true)).toBe(false)
    expect(shouldSendNotification('PROMOTION', false)).toBe(true)
    for (const event of NOTIFICATION_EVENTS.filter((e) => e !== 'PROMOTION')) {
      expect(isPromotionalEvent(event)).toBe(false)
      expect(shouldSendNotification(event, true)).toBe(true)
    }
  })
})
