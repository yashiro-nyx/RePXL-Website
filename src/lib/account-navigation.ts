export interface NavItem {
  href: string
  label: string
  group: string
  /** Sub-items shown when the parent section is active */
  children?: NavItem[]
}

export const accountNavigation: NavItem[] = [
  // ── My Account ────────────────────────────────────────────────────────────
  { href: '/account/profile',               label: 'Profile',               group: 'My Account' },
  { href: '/account/addresses',             label: 'Addresses',             group: 'My Account' },
  { href: '/account/security/password',     label: 'Change Password',       group: 'My Account' },
  {
    href: '/account/security',
    label: 'Security',
    group: 'My Account',
    children: [
      { href: '/account/security/mfa', label: 'Two-Factor Auth', group: 'My Account' },
    ],
  },
  { href: '/account/notification-settings', label: 'Notification Settings', group: 'My Account' },
  // ── Standalone sections ───────────────────────────────────────────────────
  { href: '/account/orders',    label: 'My Purchases',   group: 'My Purchases' },
  { href: '/account/payments',  label: 'Payments',       group: 'Payments' },
  { href: '/account/reviews',   label: 'My Reviews',     group: 'My Reviews' },
  // Notifications: parent + three independently-routable children
  {
    href: '/account/notifications',
    label: 'Notifications',
    group: 'Notifications',
    children: [
      {
        href:  '/account/notifications/order-updates',
        label: 'Order Updates',
        group: 'Notifications',
      },
      {
        href:  '/account/notifications/promotions',
        label: 'Promotions',
        group: 'Notifications',
      },
      {
        href:  '/account/notifications/repixl-updates',
        label: 'RePIXL Updates',
        group: 'Notifications',
      },
    ],
  },
  { href: '/account/vouchers', label: 'My Vouchers', group: 'My Vouchers' },
] as const

/** Groups in display order */
export const NAV_GROUPS = [
  'My Account',
  'My Purchases',
  'Payments',
  'My Reviews',
  'Notifications',
  'My Vouchers',
] as const

/**
 * Whether a sidebar item should be considered "active" for the given pathname.
 * Matches exact path OR any descendant path (ignoring query strings).
 */
export function accountSectionActive(pathname: string, href: string): boolean {
  const cleanPath = pathname.split('?')[0]
  const cleanHref = href.split('?')[0]
  return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`)
}

// ── Order status filters ──────────────────────────────────────────────────────

export const purchaseFilters = [
  'All',
  'Processing',
  'Shipped',
  'Delivered',
  'Completed',
  'Cancelled',
] as const
export type PurchaseFilter = (typeof purchaseFilters)[number]

export function matchesPurchaseFilter(
  order: { status: string },
  filter: PurchaseFilter
): boolean {
  return filter === 'All' || order.status === filter
}
