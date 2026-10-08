import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const feedback = readFileSync('src/components/ui/FeedbackState.tsx', 'utf8')
const products = readFileSync('src/app/(storefront)/products/page.tsx', 'utf8')
const wishlist = readFileSync('src/app/(storefront)/wishlist/page.tsx', 'utf8')
const compare = readFileSync('src/app/(storefront)/compare/page.tsx', 'utf8')
const cart = readFileSync('src/app/(storefront)/cart/page.tsx', 'utf8')
const detail = readFileSync('src/app/(storefront)/products/[slug]/page.tsx', 'utf8')
const checkout = readFileSync('src/app/(storefront)/checkout/page.tsx', 'utf8')

describe('Phase 3 feedback states', () => {
  it('provides semantic loading, error, and empty states with live messaging', () => {
    expect(feedback).toContain("type FeedbackKind = 'loading' | 'error' | 'empty'")
    expect(feedback).toContain('role={liveRole}')
    expect(feedback).toContain('aria-live=')
    expect(feedback).toContain('motion-reduce:hidden')
  })

  it('covers the primary catalog and purchase-adjacent data surfaces', () => {
    for (const source of [products, wishlist, compare, cart, detail]) {
      expect(source).toContain('FeedbackState')
      expect(source).toContain('Try again')
    }
  })

  it('sanitizes checkout payment failures before rendering them', () => {
    expect(checkout).toContain("toUserMessage(err, 'SERVER')")
    expect(checkout).not.toContain('setPaymentError(err.message)')
  })
})
