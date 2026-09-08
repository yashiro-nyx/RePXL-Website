/**
 * Tests for the shared useNotificationCount hook and the improved polling architecture.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// ── Shared hook contract ──────────────────────────────────────────────────────

describe('useNotificationCount hook', () => {
  it('exports the hook', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('export function useNotificationCount')
  })

  it('polls every 20 seconds (POLL_INTERVAL_MS = 20_000), not 60 seconds', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('POLL_INTERVAL_MS = 20_000')
    expect(src).not.toContain('60_000')
  })

  it('registers visibilitychange listener for background-tab pause', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('visibilitychange')
    expect(src).toContain('document.hidden')
  })

  it('registers window focus listener for immediate refresh on tab focus', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain("window.addEventListener('focus'")
  })

  it('removes all listeners on cleanup', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain("document.removeEventListener('visibilitychange'")
    expect(src).toContain("window.removeEventListener('focus'")
    expect(src).toContain('clearInterval')
  })

  it('deduplicates rapid calls with a 3-second cooldown', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('3_000')
    expect(src).toContain('lastFetchRef')
  })

  it('fetches from the correct authenticated endpoint', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('/api/notifications/unread-count')
    expect(src).toContain("credentials: 'include'")
  })

  it('never accepts userId from caller — ownership is server-enforced', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    // The hook's function signature only accepts isLoggedIn (boolean), not a userId param
    expect(src).toContain('isLoggedIn: boolean')
    // The API call never appends a client-supplied userId to the request
    expect(src).not.toContain("searchParams.set('userId'")
    expect(src).not.toContain("?userId=")
  })

  it('provides decrementCount for optimistic mark-read updates', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('decrementCount')
  })

  it('provides setCount for mark-all-read', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('setCount')
  })

  it('resets to empty state on logout (isLoggedIn → false)', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toContain('EMPTY')
    expect(src).toContain('setState(EMPTY)')
  })
})

// ── Navbar no longer has its own independent poller ───────────────────────────

describe('Navbar uses shared hook, no independent polling', () => {
  it('imports useNotificationCount', () => {
    const src = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    expect(src).toContain("from '@/hooks/useNotificationCount'")
  })

  it('does not have its own setInterval for notification count', () => {
    const src = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    // fetchUnreadCount and the old 60_000 interval should be gone
    expect(src).not.toContain('fetchUnreadCount')
    expect(src).not.toContain("setInterval(fetch")
  })

  it('passes onOpen to NavBellDropdown for bell-open refresh', () => {
    const src = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    expect(src).toContain('onOpen={refreshUnreadCount}')
  })
})

// ── AccountShell uses shared hook, no independent poller ─────────────────────

describe('AccountShell uses shared hook, no independent polling', () => {
  it('imports useNotificationCount', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(src).toContain("from '@/hooks/useNotificationCount'")
  })

  it('does not have its own setInterval for notification count', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(src).not.toContain('setInterval(refreshUnread')
    expect(src).not.toContain('60_000')
  })

  it('derives unreadCount and categoryUnreadCounts from the shared hook state', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(src).toContain('useNotificationCount(isLoggedIn)')
    expect(src).toContain('notifState.count')
    expect(src).toContain('notifState.byCategory')
  })
})

// ── NavBellDropdown refreshes on open ────────────────────────────────────────

describe('NavBellDropdown onOpen prop', () => {
  it('accepts optional onOpen prop', () => {
    const src = readFileSync('src/components/layout/NavBellDropdown.tsx', 'utf8')
    expect(src).toContain('onOpen?:')
  })

  it('calls onOpen when dropdown is opened', () => {
    const src = readFileSync('src/components/layout/NavBellDropdown.tsx', 'utf8')
    expect(src).toContain('onOpen?.()')
  })
})

// ── NotificationList refreshes on visibility ─────────────────────────────────

describe('NotificationList visibility refresh', () => {
  it('registers visibilitychange listener to refetch when tab becomes visible', () => {
    const src = readFileSync('src/components/account/NotificationList.tsx', 'utf8')
    expect(src).toContain('visibilitychange')
    expect(src).toContain('document.hidden')
  })

  it('registers window focus listener', () => {
    const src = readFileSync('src/components/account/NotificationList.tsx', 'utf8')
    expect(src).toContain("window.addEventListener('focus'")
  })

  it('removes listeners on cleanup', () => {
    const src = readFileSync('src/components/account/NotificationList.tsx', 'utf8')
    expect(src).toContain("document.removeEventListener('visibilitychange'")
    expect(src).toContain("window.removeEventListener('focus'")
  })
})

// ── Polling interval reduction confirmed ─────────────────────────────────────

describe('polling interval improvement', () => {
  it('Navbar no longer directly polls at 60 seconds', () => {
    const src = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    // The old pattern was setInterval(fetchUnreadCount, 60_000)
    expect(src).not.toMatch(/setInterval.*60_000/)
    expect(src).not.toMatch(/setInterval.*60000/)
  })

  it('AccountShell no longer directly polls at 60 seconds', () => {
    const src = readFileSync('src/components/account/AccountShell.tsx', 'utf8')
    expect(src).not.toMatch(/setInterval.*60_000/)
    expect(src).not.toMatch(/setInterval.*60000/)
  })

  it('shared hook polls at 20 seconds', () => {
    const src = readFileSync('src/hooks/useNotificationCount.ts', 'utf8')
    expect(src).toMatch(/POLL_INTERVAL_MS\s*=\s*20_000/)
  })
})
