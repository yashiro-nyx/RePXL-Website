import { describe, it, expect } from 'vitest'
import {
  aggregateRatings,
  averageRatingFor,
  formatAverage,
  roundedStars,
  ratingCountLabel,
  filterReviewsByRating,
  parseRatingFilter,
  REVIEWS_PAGE_SIZE,
  STAR_VALUES,
  type RatingLike,
} from './rating-aggregate'
import { paginate } from './catalog-filters'

// Build a realistic distribution: 5★×105, 4★×15, 3★×5, 2★×2, 1★×1 = 128 total.
// Sum = 525 + 60 + 15 + 4 + 1 = 605 → avg = 605/128 = 4.7265625 → "4.7".
function makeReviews(dist: Partial<Record<number, number>>): RatingLike[] {
  const out: RatingLike[] = []
  for (const [star, n] of Object.entries(dist)) {
    for (let i = 0; i < (n ?? 0); i++) out.push({ rating: Number(star) })
  }
  return out
}

const BIG = makeReviews({ 5: 105, 4: 15, 3: 5, 2: 2, 1: 1 })

describe('aggregateRatings — real average, count, distribution', () => {
  it('computes the correct average and total count', () => {
    const s = aggregateRatings(BIG)
    expect(s.count).toBe(128)
    expect(s.average).toBeCloseTo(605 / 128, 6)
  })

  it('computes an exact per-star distribution', () => {
    const s = aggregateRatings(BIG)
    expect(s.distribution).toEqual({ 5: 105, 4: 15, 3: 5, 2: 2, 1: 1 })
  })

  it('returns a zeroed summary for no reviews (never fabricates a rating)', () => {
    const s = aggregateRatings([])
    expect(s).toEqual({ average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })
  })

  it('ignores malformed/out-of-range ratings rather than coercing them', () => {
    const s = aggregateRatings([{ rating: 5 }, { rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: 4 }])
    // Only the valid 5 and 4 count.
    expect(s.count).toBe(2)
    expect(s.average).toBe(4.5)
    expect(s.distribution).toEqual({ 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 })
  })

  it('individual star counts: 5/4/3/2/1', () => {
    const d = aggregateRatings(BIG).distribution
    expect(d[5]).toBe(105)
    expect(d[4]).toBe(15)
    expect(d[3]).toBe(5)
    expect(d[2]).toBe(2)
    expect(d[1]).toBe(1)
  })
})

describe('averageRatingFor — per-product average from a mixed list', () => {
  it('averages only matching reviews', () => {
    const mixed: (RatingLike & { slug: string })[] = [
      { slug: 'a', rating: 5 },
      { slug: 'a', rating: 4 },
      { slug: 'b', rating: 1 },
    ]
    expect(averageRatingFor(mixed, (r: any) => r.slug === 'a')).toBe(4.5)
    expect(averageRatingFor(mixed, (r: any) => r.slug === 'b')).toBe(1)
    expect(averageRatingFor(mixed, (r: any) => r.slug === 'z')).toBe(0)
  })
})

describe('formatAverage — one-decimal display, unrated → null', () => {
  it('shows one decimal place including trailing .0', () => {
    expect(formatAverage({ average: 5, count: 3 })).toBe('5.0')
    expect(formatAverage({ average: 4.92, count: 10 })).toBe('4.9')
    expect(formatAverage({ average: 4.34, count: 10 })).toBe('4.3')
  })
  it('does NOT show excessive precision', () => {
    expect(formatAverage({ average: 605 / 128, count: 128 })).toBe('4.7')
  })
  it('returns null for an unrated product (caller shows "No ratings yet")', () => {
    expect(formatAverage({ average: 0, count: 0 })).toBeNull()
  })
})

describe('roundedStars / ratingCountLabel', () => {
  it('rounds to nearest whole star, clamped 0..5', () => {
    expect(roundedStars(4.9)).toBe(5)
    expect(roundedStars(4.4)).toBe(4)
    expect(roundedStars(0)).toBe(0)
    expect(roundedStars(NaN)).toBe(0)
    expect(roundedStars(9)).toBe(5)
  })
  it('labels singular/plural correctly', () => {
    expect(ratingCountLabel(0)).toBe('0 ratings')
    expect(ratingCountLabel(1)).toBe('1 rating')
    expect(ratingCountLabel(28)).toBe('28 ratings')
    expect(ratingCountLabel(128)).toBe('128 ratings')
  })
})

describe('filterReviewsByRating — All vs exact star (runs BEFORE pagination)', () => {
  const reviews = BIG.map((r, i) => ({ ...r, id: `r${i}` }))

  it('All returns every review', () => {
    expect(filterReviewsByRating(reviews, null)).toHaveLength(128)
  })
  it('an exact star returns only that star', () => {
    expect(filterReviewsByRating(reviews, 5)).toHaveLength(105)
    expect(filterReviewsByRating(reviews, 4)).toHaveLength(15)
    expect(filterReviewsByRating(reviews, 1)).toHaveLength(1)
  })
  it('a star with no reviews returns an empty set (empty-state)', () => {
    const noTwoStar = makeReviews({ 5: 3, 4: 1 }).map((r, i) => ({ ...r, id: `x${i}` }))
    expect(filterReviewsByRating(noTwoStar, 2)).toHaveLength(0)
  })
})

describe('parseRatingFilter — URL ?rating= parsing', () => {
  it('maps valid stars, "all"/empty/invalid → null', () => {
    expect(parseRatingFilter('5')).toBe(5)
    expect(parseRatingFilter('1')).toBe(1)
    expect(parseRatingFilter('all')).toBeNull()
    expect(parseRatingFilter('')).toBeNull()
    expect(parseRatingFilter(null)).toBeNull()
    expect(parseRatingFilter('6')).toBeNull()
    expect(parseRatingFilter('abc')).toBeNull()
  })
})

describe('filter → paginate order (filtered result drives pagination)', () => {
  const reviews = BIG.map((r, i) => ({ ...r, id: `r${i}` }))

  it('default page size is 5', () => {
    expect(REVIEWS_PAGE_SIZE).toBe(5)
  })

  it('paginates the FILTERED set, not the full set', () => {
    // Select 5★ (105 reviews) → 105/5 = 21 pages.
    const filtered = filterReviewsByRating(reviews, 5)
    const p = paginate(filtered, 1, REVIEWS_PAGE_SIZE)
    expect(p.total).toBe(105)
    expect(p.totalPages).toBe(21)
    expect(p.items).toHaveLength(5)
    expect(p.items.every((r) => r.rating === 5)).toBe(true)
  })

  it('All (128) → 26 pages; switching filters recomputes pagination', () => {
    const all = filterReviewsByRating(reviews, null)
    expect(paginate(all, 1, REVIEWS_PAGE_SIZE).totalPages).toBe(Math.ceil(128 / 5))
    const oneStar = filterReviewsByRating(reviews, 1)
    expect(paginate(oneStar, 1, REVIEWS_PAGE_SIZE).totalPages).toBe(1)
  })

  it('an out-of-range page clamps into the filtered range', () => {
    const filtered = filterReviewsByRating(reviews, 4) // 15 → 3 pages
    expect(paginate(filtered, 99, REVIEWS_PAGE_SIZE).page).toBe(3)
  })
})

describe('STAR_VALUES ordering', () => {
  it('is high → low for the distribution/filter UI', () => {
    expect([...STAR_VALUES]).toEqual([5, 4, 3, 2, 1])
  })
})
