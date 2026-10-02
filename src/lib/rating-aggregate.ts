/**
 * Rating aggregation — pure, framework-free, and the SINGLE source of truth for
 * how RePXL turns raw review records into an average, a total count, and a
 * per-star distribution.
 *
 * Every surface that shows a rating (ProductCard, the Cameras catalog's
 * `ratingBySlug`, the product detail summary, the Customer Reviews section, and
 * the Compare page) computes it through these helpers so a product can never
 * show `4.9` in one place and `4.7` in another.
 *
 * All values are REAL:
 *  - `average` is the arithmetic mean of the actual `rating` fields (1–5).
 *  - `count` is the actual number of review records.
 *  - `distribution` counts how many reviews carry each star value.
 * Nothing is fabricated; a product with no reviews aggregates to
 * `{ average: 0, count: 0, ... }` and callers render an explicit unrated state.
 */

/** The minimal shape this module needs from a review record. */
export interface RatingLike {
  rating: number
}

/** Valid star values, high → low (matches how the filter/distribution read). */
export const STAR_VALUES = [5, 4, 3, 2, 1] as const
export type StarValue = (typeof STAR_VALUES)[number]

/** Per-star review counts (how many reviews have exactly N stars). */
export type RatingDistribution = Record<StarValue, number>

export interface RatingSummary {
  /** Arithmetic mean of all ratings (0 when there are none). Full precision. */
  average: number
  /** Total number of ratings/reviews. */
  count: number
  /** Count of reviews per exact star value. */
  distribution: RatingDistribution
}

const EMPTY_DISTRIBUTION: RatingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }

/** True for a finite star value in 1..5 (defends against malformed data). */
function isValidStar(n: number): n is StarValue {
  return Number.isFinite(n) && n >= 1 && n <= 5 && Number.isInteger(n)
}

/**
 * Aggregate a list of review-like records into {average, count, distribution}.
 * Records with an out-of-range/non-integer rating are ignored for the average
 * and distribution (never coerced), so bad data can't skew the number.
 */
export function aggregateRatings(reviews: readonly RatingLike[]): RatingSummary {
  const distribution: RatingDistribution = { ...EMPTY_DISTRIBUTION }
  let sum = 0
  let count = 0
  for (const r of reviews) {
    if (!isValidStar(r.rating)) continue
    distribution[r.rating] += 1
    sum += r.rating
    count += 1
  }
  return {
    average: count > 0 ? sum / count : 0,
    count,
    distribution,
  }
}

/**
 * Convenience: average rating for a single product from a mixed review list,
 * matching a predicate (e.g. by slug). Returns 0 when unrated. Used to build
 * the catalog's `ratingBySlug` map from the bulk-hydrated review store.
 */
export function averageRatingFor(
  reviews: readonly RatingLike[],
  predicate: (r: RatingLike) => boolean
): number {
  return aggregateRatings(reviews.filter(predicate)).average
}

/**
 * Format an average for display at one decimal place, e.g. 5, 4.9, 4.3.
 * `5.0` reads as `5.0` (not `5`) so the scale is always obvious. Returns null
 * for an unrated product so callers show an explicit "No ratings yet" state
 * instead of a misleading `0.0`.
 */
export function formatAverage(summary: Pick<RatingSummary, 'average' | 'count'>): string | null {
  if (summary.count <= 0) return null
  return summary.average.toFixed(1)
}

/** Rounded star count (nearest whole star) for solid-star rendering. */
export function roundedStars(average: number): number {
  if (!Number.isFinite(average)) return 0
  return Math.max(0, Math.min(5, Math.round(average)))
}

/** "1 rating" / "28 ratings" — correct singular/plural. */
export function ratingCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'rating' : 'ratings'}`
}

// ─── Rating filter (for the Customer Reviews section) ────────────────────────

/** null = "All"; otherwise the exact star value to show. */
export type RatingFilter = StarValue | null

/**
 * Filter reviews to a single exact star value, or return all when `filter` is
 * null. This runs BEFORE pagination so the paginated result set reflects the
 * selected star, not just the current page.
 */
export function filterReviewsByRating<T extends RatingLike>(reviews: readonly T[], filter: RatingFilter): T[] {
  if (filter === null) return [...reviews]
  return reviews.filter((r) => r.rating === filter)
}

/** Parse a raw `?rating=` query value into a valid RatingFilter (null = All). */
export function parseRatingFilter(raw: string | null | undefined): RatingFilter {
  if (raw == null || raw === '' || raw.toLowerCase() === 'all') return null
  const n = Number(raw)
  return isValidStar(n) ? n : null
}

// ─── Review pagination ───────────────────────────────────────────────────────
// The Customer Reviews list paginates AFTER the rating filter. A smaller page
// size than the catalog keeps each review readable rather than an endless list.

export const REVIEWS_PAGE_SIZE = 5
