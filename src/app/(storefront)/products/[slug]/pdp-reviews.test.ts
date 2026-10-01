import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Structural/contract tests (node-env, no DOM renderer) matching the repo's
// catalog-ui.test.ts convention. Behavioral rating/filter/pagination logic is
// covered by rating-aggregate.test.ts; sold count by products-sold-count.test.ts.

const pdp = readFileSync('src/app/(storefront)/products/[slug]/page.tsx', 'utf8')
const card = readFileSync('src/components/product/ProductCard.tsx', 'utf8')
const catalog = readFileSync('src/app/(storefront)/products/page.tsx', 'utf8')
const compare = readFileSync('src/app/(storefront)/compare/page.tsx', 'utf8')
const reviewStore = readFileSync('src/stores/reviewStore.ts', 'utf8')
const productRoute = readFileSync('src/app/api/products/[slug]/route.ts', 'utf8')

describe('PDP rating summary — value + stars + count + sold', () => {
  it('uses the centralized aggregation + one-decimal + count label + sold count', () => {
    expect(pdp).toContain("from '@/lib/rating-aggregate'")
    expect(pdp).toContain('aggregateRatings')
    expect(pdp).toContain('formatAverage')
    expect(pdp).toContain('ratingCountLabel')
    // Sold count is passed into the summary and rendered.
    expect(pdp).toContain('ProductRatingSummary slug={product.slug} soldCount={soldCount}')
    expect(pdp).toContain('sold')
  })
  it('shows an explicit unrated state (not 0.0)', () => {
    expect(pdp).toContain('No ratings yet')
  })
})

describe('PDP Customer Reviews — distribution, filter, pagination, empty states', () => {
  it('is titled "Customer Reviews"', () => {
    expect(pdp).toContain('Customer Reviews')
  })
  it('renders a per-star distribution and segmented star filters with real counts', () => {
    expect(pdp).toContain('Rating distribution')
    expect(pdp).toContain('summary.distribution[star]')
    expect(pdp).toContain('All (')
    expect(pdp).toContain('Star (')
    expect(pdp).toContain('FilterPill')
    expect(pdp).toContain('aria-pressed={selected}')
  })
  it('filters BEFORE paginating (ALL → FILTER → PAGINATE)', () => {
    expect(pdp).toContain('filterReviewsByRating(reviews, ratingFilter)')
    expect(pdp).toMatch(/filtered[\s\S]*paginate\(filtered/)
    expect(pdp).toContain('REVIEWS_PAGE_SIZE')
  })
  it('resets to page 1 when the rating filter changes', () => {
    expect(pdp).toContain('setPage(1)')
  })
  it('mirrors rating + page in the URL without extra history/params', () => {
    expect(pdp).toContain('reviewPage')
    expect(pdp).toContain("params.set('rating'")
    expect(pdp).toContain('history.replaceState')
    expect(pdp).toContain("parseRatingFilter(searchParams.get('rating')")
  })
  it('reuses the accessible Pagination component', () => {
    expect(pdp).toContain('<Pagination')
    expect(pdp).toContain("from '@/components/product/catalog/Pagination'")
  })
  it('handles both empty states (no reviews / no reviews for selected star)', () => {
    expect(pdp).toContain('Be the first to share your experience')
    expect(pdp).toContain('-star reviews for this camera')
    expect(pdp).toContain('Back to all reviews')
  })
  it('communicates current page to assistive tech (not stars/bars alone)', () => {
    expect(pdp).toContain('role="status"')
    expect(pdp).toContain('Showing page')
  })
})

describe('Rating consistency — one aggregation everywhere', () => {
  it('ProductCard uses aggregateRatings', () => {
    expect(card).toContain("from '@/lib/rating-aggregate'")
    expect(card).toContain('aggregateRatings')
  })
  it('the catalog ratingBySlug uses aggregateRatings', () => {
    expect(catalog).toContain('aggregateRatings')
  })
  it('the review store selectors (used by Compare) use aggregateRatings', () => {
    expect(reviewStore).toContain('aggregateRatings')
    expect(reviewStore).toContain('getAverageRating')
  })
})

describe('Sold count — real completed sales only', () => {
  it('sums OrderItem.quantity for DELIVERED/COMPLETED orders via one aggregate', () => {
    expect(productRoute).toContain('orderItem.aggregate')
    expect(productRoute).toContain('_sum: { quantity: true }')
    expect(productRoute).toContain("['DELIVERED', 'COMPLETED']")
    expect(productRoute).toContain('soldCount')
  })
})

describe('Compare page — centered heading matching Cameras', () => {
  it('centers the heading + subtitle like the Cameras page', () => {
    expect(compare).toContain('mx-auto mb-10 max-w-2xl text-center')
    expect(compare).toContain('Compare Cameras')
    // Same centered subtitle treatment as the catalog header.
    expect(compare).toContain('mx-auto mt-3 max-w-xl text-sm leading-relaxed text-repixl-muted')
  })
})
