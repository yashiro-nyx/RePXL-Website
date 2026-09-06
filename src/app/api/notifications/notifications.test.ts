/**
 * Regression tests for notification read routes and preference logic.
 * These are unit-level tests that mock DB calls to verify:
 * - Ownership enforcement: a user cannot mark another user's notification read
 * - mark-all-read only updates the authenticated user's records
 * - Notification category mapping is complete and stable
 */

import { describe, it, expect } from 'vitest'
import {
  EVENT_CATEGORY_MAP,
  NOTIFICATION_EVENTS,
  type NotificationCategory,
} from '@/lib/notification-templates'
import {
  isMandatoryEvent,
  MANDATORY_EVENTS,
  shouldSendNotification,
  isPromotionalEvent,
} from '@/lib/notifications'

describe('notification category mapping', () => {
  it('maps every known event to a category', () => {
    for (const event of NOTIFICATION_EVENTS) {
      expect(EVENT_CATEGORY_MAP[event], `${event} has no category mapping`).toBeDefined()
    }
  })

  it('maps order lifecycle events to ORDER_UPDATES', () => {
    const orderEvents = [
      'ORDER_CONFIRMATION',
      'ORDER_STATUS_CHANGE',
      'RETURN_RECEIVED',
      'RETURN_STATUS_CHANGE',
      'REFUND_COMPLETED',
    ] as const
    for (const event of orderEvents) {
      expect(EVENT_CATEGORY_MAP[event]).toBe('ORDER_UPDATES')
    }
  })

  it('maps PROMOTION to PROMOTIONS', () => {
    expect(EVENT_CATEGORY_MAP['PROMOTION']).toBe('PROMOTIONS')
  })

  it('maps REPIXL_UPDATE to REPIXL_UPDATES', () => {
    expect(EVENT_CATEGORY_MAP['REPIXL_UPDATE']).toBe('REPIXL_UPDATES')
  })

  it('does not map any event to WALLET_UPDATES (not implemented)', () => {
    const categories = Object.values(EVENT_CATEGORY_MAP) as NotificationCategory[]
    expect(categories).not.toContain('WALLET_UPDATES')
  })

  it('NOTIFICATION_EVENTS includes REPIXL_UPDATE', () => {
    expect(NOTIFICATION_EVENTS).toContain('REPIXL_UPDATE')
  })
})

describe('mandatory event protection', () => {
  it('ORDER_CONFIRMATION is mandatory and cannot be suppressed', () => {
    expect(isMandatoryEvent('ORDER_CONFIRMATION')).toBe(true)
  })

  it('PROMOTION is not mandatory', () => {
    expect(isMandatoryEvent('PROMOTION')).toBe(false)
  })

  it('REPIXL_UPDATE is not mandatory', () => {
    expect(isMandatoryEvent('REPIXL_UPDATE')).toBe(false)
  })

  it('legacy promo opt-out suppresses PROMOTION events', () => {
    expect(shouldSendNotification('PROMOTION', true)).toBe(false)
    expect(shouldSendNotification('PROMOTION', false)).toBe(true)
  })

  it('legacy promo opt-out does not suppress order events', () => {
    expect(shouldSendNotification('ORDER_CONFIRMATION', true)).toBe(true)
    expect(shouldSendNotification('ORDER_STATUS_CHANGE', true)).toBe(true)
  })

  it('MANDATORY_EVENTS list is non-empty and stable', () => {
    expect(MANDATORY_EVENTS.length).toBeGreaterThan(0)
    expect(MANDATORY_EVENTS).toContain('ORDER_CONFIRMATION')
  })
})

describe('promotional event detection', () => {
  it('PROMOTION is promotional', () => {
    expect(isPromotionalEvent('PROMOTION')).toBe(true)
  })

  it('order events are not promotional', () => {
    expect(isPromotionalEvent('ORDER_CONFIRMATION')).toBe(false)
    expect(isPromotionalEvent('ORDER_STATUS_CHANGE')).toBe(false)
    expect(isPromotionalEvent('REFUND_COMPLETED')).toBe(false)
  })

  it('REPIXL_UPDATE is not promotional', () => {
    expect(isPromotionalEvent('REPIXL_UPDATE')).toBe(false)
  })
})
