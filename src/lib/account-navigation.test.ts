import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  accountNavigation,
  accountSectionActive,
  matchesPurchaseFilter,
  purchaseFilters,
  NAV_GROUPS,
} from './account-navigation'

const redirect = vi.hoisted(() => vi.fn())
vi.mock('next/navigation', () => ({ redirect }))
import AccountPage from '@/app/(storefront)/account/page'

describe('customer account navigation', () => {
  it('opens purchases rather than a dashboard', () => {
    AccountPage()
    expect(redirect).toHaveBeenCalledWith('/account/orders')
  })

  it('contains all required top-level nav items', () => {
    const labels = accountNavigation.map((item) => item.label)
    expect(labels).toContain('Profile')
    expect(labels).toContain('Addresses')
    expect(labels).toContain('Change Password')
    expect(labels).toContain('Security')
    expect(labels).toContain('Notification Settings')
    expect(labels).toContain('My Purchases')
    expect(labels).toContain('Payments')
    expect(labels).toContain('My Reviews')
    expect(labels).toContain('Notifications')
    expect(labels).toContain('My Vouchers')
  })

  it('groups items under the expected group names', () => {
    const myAccountItems = accountNavigation.filter((i) => i.group === 'My Account').map((i) => i.label)
    expect(myAccountItems).toContain('Profile')
    expect(myAccountItems).toContain('Addresses')
    expect(myAccountItems).toContain('Security')
    expect(myAccountItems).toContain('Notification Settings')

    expect(accountNavigation.find((i) => i.label === 'My Purchases')?.group).toBe('My Purchases')
    expect(accountNavigation.find((i) => i.label === 'Payments')?.group).toBe('Payments')
    expect(accountNavigation.find((i) => i.label === 'Notifications')?.group).toBe('Notifications')
    expect(accountNavigation.find((i) => i.label === 'My Vouchers')?.group).toBe('My Vouchers')  })

  it('NAV_GROUPS covers all groups used in navigation items', () => {
    const usedGroups = new Set(accountNavigation.map((i) => i.group))
    for (const group of Array.from(usedGroups)) {
      expect(NAV_GROUPS).toContain(group)
    }
  })

  it('Security item has MFA as a child', () => {
    const security = accountNavigation.find((i) => i.href === '/account/security')
    expect(security?.children?.map((c) => c.label)).toContain('Two-Factor Auth')
  })

  // ── Notification subroutes ────────────────────────────────────────────────

  it('Notifications item has three real-path children (not query-param children)', () => {
    const notif = accountNavigation.find((i) => i.href === '/account/notifications')
    expect(notif).toBeDefined()
    const childHrefs = notif!.children!.map((c) => c.href)
    expect(childHrefs).toContain('/account/notifications/order-updates')
    expect(childHrefs).toContain('/account/notifications/promotions')
    expect(childHrefs).toContain('/account/notifications/repixl-updates')
    // None of the children should use query-param routing
    for (const href of childHrefs) {
      expect(href).not.toContain('?')
    }
  })

  it('Notifications children carry correct labels', () => {
    const notif = accountNavigation.find((i) => i.href === '/account/notifications')!
    const childLabels = notif.children!.map((c) => c.label)
    expect(childLabels).toContain('Order Updates')
    expect(childLabels).toContain('Promotions')
    expect(childLabels).toContain('RePIXL Updates')
  })

  it('accountSectionActive: parent Notifications active on /account/notifications', () => {
    expect(accountSectionActive('/account/notifications', '/account/notifications')).toBe(true)
  })

  it('accountSectionActive: parent Notifications active on Order Updates subroute', () => {
    expect(accountSectionActive('/account/notifications/order-updates', '/account/notifications')).toBe(true)
  })

  it('accountSectionActive: parent Notifications active on Promotions subroute', () => {
    expect(accountSectionActive('/account/notifications/promotions', '/account/notifications')).toBe(true)
  })

  it('accountSectionActive: parent Notifications active on RePIXL Updates subroute', () => {
    expect(accountSectionActive('/account/notifications/repixl-updates', '/account/notifications')).toBe(true)
  })

  it('accountSectionActive: Order Updates child is active only on its own path', () => {
    expect(accountSectionActive('/account/notifications/order-updates', '/account/notifications/order-updates')).toBe(true)
    expect(accountSectionActive('/account/notifications/promotions', '/account/notifications/order-updates')).toBe(false)
    expect(accountSectionActive('/account/notifications/repixl-updates', '/account/notifications/order-updates')).toBe(false)
    expect(accountSectionActive('/account/notifications', '/account/notifications/order-updates')).toBe(false)
  })

  it('accountSectionActive: Promotions child is active only on its own path', () => {
    expect(accountSectionActive('/account/notifications/promotions', '/account/notifications/promotions')).toBe(true)
    expect(accountSectionActive('/account/notifications/order-updates', '/account/notifications/promotions')).toBe(false)
  })

  it('accountSectionActive: RePIXL Updates child is active only on its own path', () => {
    expect(accountSectionActive('/account/notifications/repixl-updates', '/account/notifications/repixl-updates')).toBe(true)
    expect(accountSectionActive('/account/notifications/promotions', '/account/notifications/repixl-updates')).toBe(false)
  })

  it('notification subroute pages exist and render the shared NotificationList component', () => {
    const orderUpdates = readFileSync(
      'src/app/(storefront)/account/notifications/order-updates/page.tsx', 'utf8'
    )
    const promotions = readFileSync(
      'src/app/(storefront)/account/notifications/promotions/page.tsx', 'utf8'
    )
    const repixlUpdates = readFileSync(
      'src/app/(storefront)/account/notifications/repixl-updates/page.tsx', 'utf8'
    )
    // All three must use the shared component
    expect(orderUpdates).toContain('NotificationList')
    expect(promotions).toContain('NotificationList')
    expect(repixlUpdates).toContain('NotificationList')
    // Each must apply the correct filter
    expect(orderUpdates).toContain('ORDER_UPDATES')
    expect(promotions).toContain('PROMOTIONS')
    expect(repixlUpdates).toContain('REPIXL_UPDATES')
  })

  it('notification base page uses showTabs for category navigation', () => {
    const base = readFileSync(
      'src/app/(storefront)/account/notifications/page.tsx', 'utf8'
    )
    expect(base).toContain('showTabs')
    expect(base).toContain('NotificationList')
  })

  it('NavBellDropdown uses View All Notifications link to /account/notifications', () => {
    const dropdown = readFileSync(
      'src/components/layout/NavBellDropdown.tsx', 'utf8'
    )
    expect(dropdown).toContain('/account/notifications')
    expect(dropdown).toContain('View All Notifications')
    // Must use CATEGORY_META routes so all three categories are accessible
    expect(dropdown).toContain('CATEGORY_META')
  })

  it('Navbar imports NavBellDropdown instead of using a direct router.push bell', () => {
    const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8')
    expect(navbar).toContain('NavBellDropdown')
    // Old pattern should be gone
    expect(navbar).not.toContain("router.push('/account/notifications')")
  })

  // ── Existing tests ────────────────────────────────────────────────────────

  it.each(['/account/orders/ORDER-123', '/account/orders/ORDER-123/return'])(
    'keeps purchase navigation active for %s',
    (pathname) => {
      expect(accountSectionActive(pathname, '/account/orders')).toBe(true)
      expect(accountSectionActive(pathname, '/account/profile')).toBe(false)
    }
  )

  it('keeps security active for nested management pages without matching partial names', () => {
    expect(accountSectionActive('/account/security/mfa', '/account/security')).toBe(true)
    expect(accountSectionActive('/account/security/password', '/account/security')).toBe(true)
    expect(accountSectionActive('/account/orders-other', '/account/orders')).toBe(false)
  })

  it('does not include Wallet Updates or Coins in navigation', () => {
    const labels = accountNavigation.map((i) => i.label)
    expect(labels).not.toContain('Wallet Updates')
    expect(labels).not.toContain('Coins')
    expect(labels).not.toContain('Banks & Cards')
  })

  it.each([
    'Processing',
    'Shipped',
    'Delivered',
    'Completed',
    'Cancelled',
  ] as const)(
    'filters real %s order status without inferring payment state',
    (status) => {
      expect(matchesPurchaseFilter({ status }, 'All')).toBe(true)
      for (const filter of purchaseFilters.filter((value) => value !== 'All'))
        expect(matchesPurchaseFilter({ status }, filter)).toBe(status === filter)
    }
  )

  it('does not invent payment or refund states in the order read model', () => {
    expect(purchaseFilters).not.toContain('To Pay')
    expect(purchaseFilters).not.toContain('Return / Refund')
    expect(matchesPurchaseFilter({ status: 'REFUNDED' }, 'Completed')).toBe(false)
  })

  it('keeps enrollment behind its own route and reuses the existing MFA component', () => {
    const summary = readFileSync('src/components/account/SecurityOverview.tsx', 'utf8')
    expect(summary).toContain('/account/security/mfa')
    expect(summary).not.toContain('<MfaSettings')
    expect(summary).not.toContain('qrCode')
    const manage = readFileSync('src/app/(storefront)/account/security/mfa/page.tsx', 'utf8')
    expect(manage).toContain('<MfaSettings />')
  })
})

// ── Notification preview endpoint ─────────────────────────────────────────────

describe('notification preview endpoint spec', () => {
  it('preview route file exists at the expected path', () => {
    // Existence check — if the file is missing readFileSync throws
    const src = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
    expect(src).toContain('GET')
    // Must derive userId from session — never from client query params
    expect(src).toContain('getCurrentUser')
    expect(src).not.toContain("searchParams.get('userId')")
    expect(src).not.toContain('req.body.userId')
    // The userId used in the Prisma query must come from the session user, not a param
    expect(src).toContain('user.id')
  })

  it('preview route enforces a hard maximum limit (MAX_PREVIEW)', () => {
    const src = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
    expect(src).toContain('MAX_PREVIEW')
    expect(src).toContain('Math.min')
  })

  it('preview route is ordered newest-first', () => {
    const src = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
    expect(src).toContain('createdAt')
    expect(src).toContain('desc')
  })

  it('preview route returns only IN_APP channel notifications', () => {
    const src = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
    expect(src).toContain("IN_APP")
  })

  it('preview route selects only safe fields (no userId in response)', () => {
    const src = readFileSync('src/app/api/notifications/preview/route.ts', 'utf8')
    // The select object must list fields — id, event, message, isRead, createdAt
    expect(src).toContain('select')
    expect(src).toContain('isRead')
    expect(src).toContain('createdAt')
    // userId must NOT be included in the select (not returned to client)
    expect(src).not.toMatch(/select[^}]*userId/)
  })
})
