import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { accountSectionActive } from './account-navigation'

// ─── "View Orders" after successful payment ──────────────────────────────────────
// Regression guard for the reported bug: the payment success page linked "View My
// Orders" to `/account`, which redirects to `/account/profile` (Profile
// Management) — not the Orders tab. The links must target `/account/orders`.

describe('Payment success page — View Orders destination', () => {
  const success = readFileSync('src/app/(storefront)/checkout/success/page.tsx', 'utf8')

  it('every "View My Orders" link targets /account/orders (My Purchases), not /account', () => {
    // There are two "View My Orders" links (found-receipt state + pending/error state).
    const viewOrdersCount = (success.match(/View My Orders/g) ?? []).length
    expect(viewOrdersCount).toBe(2)

    // For each, the closest preceding href must be /account/orders.
    const hrefs = [...success.matchAll(/href="([^"]+)"(?:(?!href=)[\s\S]){0,220}?View My Orders/g)].map((m) => m[1])
    expect(hrefs).toHaveLength(2)
    for (const href of hrefs) {
      expect(href).toBe('/account/orders')
    }

    // No "View My Orders" link should point at bare /account (the profile redirect).
    expect(success).not.toMatch(/href="\/account"(?:(?!href=)[\s\S]){0,220}?View My Orders/)
  })

  it('does not re-finalize or re-create an order when navigating to orders (plain Link only)', () => {
    // The View Orders control is a Next.js <Link>, not a fetch/POST to checkout APIs.
    expect(success).toMatch(/<Link\s+href="\/account\/orders"/)
    expect(success).not.toMatch(/View My Orders[\s\S]{0,80}?(onClick|fetch\()/)
  })

  it('preserves the pending/verification behavior (still polls verify + orders before showing a receipt)', () => {
    expect(success).toContain('/api/checkout/verify')
    expect(success).toContain("setFetchStatus('pending')")
    // Only shows a PAID receipt once payment is confirmed.
    expect(success).toContain("paymentStatus === 'PAID'")
  })
})

describe('/account/orders is the correct Orders route and highlights My Purchases', () => {
  it('/account redirects to Profile Management (why bare /account was wrong for orders)', () => {
    const accountIndex = readFileSync('src/app/(storefront)/account/page.tsx', 'utf8')
    expect(accountIndex).toContain("redirect('/account/profile')")
  })

  it('the Orders page exists at /account/orders (My Purchases)', () => {
    const orders = readFileSync('src/app/(storefront)/account/orders/page.tsx', 'utf8')
    expect(orders).toContain('My Purchases')
  })

  it('the account sidebar marks My Purchases active on /account/orders and its sub-routes', () => {
    expect(accountSectionActive('/account/orders', '/account/orders')).toBe(true)
    expect(accountSectionActive('/account/orders/RPX-123', '/account/orders')).toBe(true)
    // And it does NOT mark Profile active there.
    expect(accountSectionActive('/account/orders', '/account/profile')).toBe(false)
  })
})
