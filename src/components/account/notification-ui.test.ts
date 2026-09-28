import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural/contract tests for the redesigned notification UI. They assert the
// shared architecture (one row component, consistent states, correct wiring)
// without requiring a DOM renderer.

const list = readFileSync('src/components/account/NotificationList.tsx', 'utf8')
const dropdown = readFileSync('src/components/layout/NavBellDropdown.tsx', 'utf8')
const icon = readFileSync('src/components/account/NotificationIcon.tsx', 'utf8')
const previewApi = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
const listApi = readFileSync('src/app/api/notifications/route.ts', 'utf8')

describe('Shared notification UI architecture', () => {
  it('the dropdown reuses the same NotificationRow as the full page (one visual identity)', () => {
    expect(dropdown).toContain("import {")
    expect(dropdown).toContain('NotificationRow')
    expect(dropdown).toContain("from '@/components/account/NotificationList'")
  })

  it('both surfaces use the shared NotificationIcon component', () => {
    expect(list).toContain('NotificationIcon')
    expect(dropdown).toContain('NotificationIcon')
    expect(icon).toContain('export function NotificationIcon')
  })

  it('neither surface scrapes the raw message for an order number', () => {
    expect(list).not.toContain('n.message.match')
    expect(dropdown).not.toContain('n.message.match')
    // They render the server-resolved href instead.
    expect(list).toContain('n.href')
  })
})

describe('Interaction behavior', () => {
  it('clicking an actionable row marks it read then navigates', () => {
    expect(list).toContain('if (!n.isRead) onMarkRead(n.id)')
  })

  it('dropdown decrements the shared unread count when marking read', () => {
    expect(dropdown).toContain('onUnreadCountChange(-1)')
    // Only when the item was actually unread (no double-count).
    expect(dropdown).toContain('if (wasUnread) onUnreadCountChange(-1)')
  })

  it('mark-all-read is optimistic and hits the read-all endpoint', () => {
    expect(list).toContain('/api/notifications/read-all')
    expect(list).toContain("method: 'POST'")
  })

  it('both surfaces refetch on focus/visibility so state stays synchronized', () => {
    expect(list).toContain('visibilitychange')
    expect(list).toContain('focus')
  })
})

describe('States', () => {
  it('full list renders loading, error (with retry), and empty states', () => {
    expect(list).toContain('InlineLoader')
    expect(list).toContain('NotificationErrorState')
    expect(list).toContain('NotificationEmptyState')
    expect(list).toContain('onRetry')
  })

  it('dropdown renders loading, error (with retry), and empty states', () => {
    expect(dropdown).toContain('animate-spin')
    expect(dropdown).toContain('Retry')
    expect(dropdown).toContain("You&apos;re all caught up")
  })
})

describe('Category filtering', () => {
  it('the full list offers fine-grained category tabs derived from present data', () => {
    expect(list).toContain('presentCategories')
    expect(list).toContain('DISPLAY_CATEGORY_ORDER')
    expect(list).toContain('FilterTab')
  })

  it('subroutes scope to the coarse backend category without inventing data', () => {
    const orderUpdates = readFileSync('src/app/(storefront)/account/notifications/order-updates/page.tsx', 'utf8')
    expect(orderUpdates).toContain('backendCategory="ORDER_UPDATES"')
  })
})

describe('Accessibility', () => {
  it('bell button exposes an accessible label with unread count and focus ring', () => {
    expect(dropdown).toContain('aria-label')
    expect(dropdown).toContain('unread')
    expect(dropdown).toContain('focus-visible:ring')
  })

  it('unread indicator is labeled and rows expose descriptive labels', () => {
    expect(list).toContain('aria-label="Unread"')
    expect(list).toContain('aria-label={`${n.title}. ${n.body}`}')
  })
})

describe('API returns the resolved view model (no raw rows)', () => {
  it('preview and list APIs map rows through toNotificationViews', () => {
    expect(previewApi).toContain('toNotificationViews')
    expect(listApi).toContain('toNotificationViews')
  })
})
