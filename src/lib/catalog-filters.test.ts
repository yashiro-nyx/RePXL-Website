import { describe, it, expect } from 'vitest'
import {
  applyFilters,
  sortProducts,
  parsePriceRange,
  hasActiveFilters,
  activeFilterCount,
  brandLogo,
  canonicalizeBrand,
  priceBounds,
  priceStep,
  clampToBounds,
  normalizePriceAgainstBounds,
  brandCounts,
  conditionCounts,
  ratingCounts,
  megapixelOptions,
  megapixelCounts,
  megapixelLabel,
  eraOptions,
  eraCounts,
  eraLabel,
  representativeProductForBrand,
  brandRepresentativeImages,
  paginate,
  clampPage,
  pageWindow,
  PAGE_ELLIPSIS,
  PAGE_SIZE,
  EMPTY_FILTERS,
  RATING_OPTIONS,
  CONDITION_OPTIONS,
  MEGAPIXEL_BUCKETS,
  ERA_BUCKETS,
  type CatalogFilters,
  type RatingBySlug,
} from './catalog-filters'
import type { Product } from '@/types'

// ── Minimal product factory (only fields the filters read) ──
function makeProduct(over: Partial<Product> & { slug: string }): Product {
  const { specs, slug, ...rest } = over
  return {
    slug,
    name: over.name ?? over.slug,
    brand: over.brand ?? 'Canon',
    series: over.series ?? '',
    price: over.price ?? 100,
    condition: over.condition ?? 'good',
    stock: over.stock ?? 5,
    description: '',
    status: over.status ?? 'active',
    image: '',
    ...rest,
    specs: specs ?? { megapixels: 5, zoom: '3x', storage: 'SD Card', year: 2005 },
  } as Product
}

const CATALOG: Product[] = [
  makeProduct({ slug: 'canon-a', brand: 'Canon', price: 89, condition: 'excellent', stock: 3, image: '/uploads/canon-a.webp', specs: { megapixels: 4, zoom: '4x', storage: 'CF', year: 2005 } }),
  makeProduct({ slug: 'nikon-b', brand: 'Nikon', price: 65, condition: 'good', stock: 0, image: '/uploads/nikon-b.webp', specs: { megapixels: 3, zoom: '3x', storage: 'SD Card', year: 2004 } }),
  makeProduct({ slug: 'sony-c', brand: 'Sony', price: 130, condition: 'mint', stock: 2, image: '/uploads/sony-c.webp', specs: { megapixels: 7, zoom: '3x', storage: 'SD Card', year: 2007 } }),
  makeProduct({ slug: 'kodak-d', brand: 'Kodak', price: 45, condition: 'fair', stock: 8, image: '/uploads/kodak-d.webp', specs: { megapixels: 5, zoom: '5x', storage: 'SD Card', year: 2006 } }),
]

const RATINGS: RatingBySlug = {
  'canon-a': 4.6,
  'nikon-b': 3.2,
  'sony-c': 5.0,
  // kodak-d intentionally unrated
}

const F = (over: Partial<CatalogFilters> = {}): CatalogFilters => ({ ...EMPTY_FILTERS, ...over })

describe('applyFilters', () => {
  it('returns all products when no filters are active', () => {
    expect(applyFilters(CATALOG, EMPTY_FILTERS, RATINGS)).toHaveLength(4)
  })

  it('filters by brand', () => {
    const r = applyFilters(CATALOG, F({ brands: ['Canon'] }), RATINGS)
    expect(r.map((p) => p.slug)).toEqual(['canon-a'])
  })

  it('filters by multiple brands (OR within group)', () => {
    const r = applyFilters(CATALOG, F({ brands: ['Canon', 'Sony'] }), RATINGS)
    expect(r.map((p) => p.slug).sort()).toEqual(['canon-a', 'sony-c'])
  })

  it('filters by condition', () => {
    const r = applyFilters(CATALOG, F({ conditions: ['mint', 'excellent'] }), RATINGS)
    expect(r.map((p) => p.slug).sort()).toEqual(['canon-a', 'sony-c'])
  })

  it('filters by price min/max (inclusive)', () => {
    expect(applyFilters(CATALOG, F({ price: { min: 60, max: 130 } }), RATINGS).map((p) => p.slug).sort())
      .toEqual(['canon-a', 'nikon-b', 'sony-c'])
    expect(applyFilters(CATALOG, F({ price: { min: 100, max: null } }), RATINGS).map((p) => p.slug))
      .toEqual(['sony-c'])
    expect(applyFilters(CATALOG, F({ price: { min: null, max: 50 } }), RATINGS).map((p) => p.slug))
      .toEqual(['kodak-d'])
  })

  it('filters in-stock only', () => {
    const r = applyFilters(CATALOG, F({ inStockOnly: true }), RATINGS)
    expect(r.map((p) => p.slug)).not.toContain('nikon-b')
  })

  it('filters by minimum rating using REAL ratings, excluding unrated products', () => {
    const r4 = applyFilters(CATALOG, F({ minRating: 4 }), RATINGS)
    expect(r4.map((p) => p.slug).sort()).toEqual(['canon-a', 'sony-c'])
    // kodak-d is unrated → excluded when a rating filter is active (never faked).
    expect(r4.map((p) => p.slug)).not.toContain('kodak-d')

    const r3 = applyFilters(CATALOG, F({ minRating: 3 }), RATINGS)
    expect(r3.map((p) => p.slug).sort()).toEqual(['canon-a', 'nikon-b', 'sony-c'])
  })

  it('combines multiple filters (AND across groups)', () => {
    const r = applyFilters(CATALOG, F({ brands: ['Canon', 'Sony', 'Nikon'], price: { min: 80, max: 200 }, minRating: 4 }), RATINGS)
    expect(r.map((p) => p.slug).sort()).toEqual(['canon-a', 'sony-c'])
  })
})

describe('sortProducts', () => {
  it('sorts by price asc/desc', () => {
    expect(sortProducts(CATALOG, 'price-asc').map((p) => p.price)).toEqual([45, 65, 89, 130])
    expect(sortProducts(CATALOG, 'price-desc').map((p) => p.price)).toEqual([130, 89, 65, 45])
  })
  it('sorts by newest (specs.year desc)', () => {
    expect(sortProducts(CATALOG, 'newest').map((p) => p.specs.year)).toEqual([2007, 2006, 2005, 2004])
  })
  it('sorts by rating desc (unrated last)', () => {
    expect(sortProducts(CATALOG, 'rating-desc', RATINGS).map((p) => p.slug)).toEqual(['sony-c', 'canon-a', 'nikon-b', 'kodak-d'])
  })
  it('does not mutate the input array', () => {
    const copy = [...CATALOG]
    sortProducts(CATALOG, 'price-asc')
    expect(CATALOG).toEqual(copy)
  })
})

describe('parsePriceRange', () => {
  it('parses valid bounds', () => {
    expect(parsePriceRange('50', '200')).toEqual({ price: { min: 50, max: 200 }, error: null })
  })
  it('allows only-min or only-max', () => {
    expect(parsePriceRange('50', '')).toEqual({ price: { min: 50, max: null }, error: null })
    expect(parsePriceRange('', '200')).toEqual({ price: { min: null, max: 200 }, error: null })
    expect(parsePriceRange('', '')).toEqual({ price: { min: null, max: null }, error: null })
  })
  it('rejects negative and non-numeric input', () => {
    expect(parsePriceRange('-5', '100').error).toBeTruthy()
    expect(parsePriceRange('abc', '100').error).toBeTruthy()
    expect(parsePriceRange('-5', '100').price).toEqual({ min: null, max: null })
  })
  it('swaps when min > max and surfaces a notice', () => {
    const r = parsePriceRange('200', '50')
    expect(r.price).toEqual({ min: 50, max: 200 })
    expect(r.error).toBeTruthy()
  })
})

describe('hasActiveFilters / activeFilterCount', () => {
  it('is false/0 for empty filters (sort is not a filter)', () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false)
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0)
  })
  it('counts each active group', () => {
    const f = F({ brands: ['Canon', 'Sony'], conditions: ['mint'], price: { min: 50, max: null }, minRating: 4, inStockOnly: true })
    expect(hasActiveFilters(f)).toBe(true)
    // 2 brands + 1 condition + 1 price + 1 rating + 1 stock = 6
    expect(activeFilterCount(f)).toBe(6)
  })
})

describe('brand logo registry (only real assets)', () => {
  it('returns asset paths only for brands that actually have a logo file', () => {
    expect(brandLogo('Canon')).toBe('/images/brand-canon.svg')
    expect(brandLogo('nikon')).toBe('/images/brand-nikon.svg')
    expect(brandLogo('Sony')).toBe('/images/brand-sony.svg')
    expect(brandLogo('Fujifilm')).toBe('/images/brand-fujifilm.svg')
    expect(brandLogo('Kodak')).toBe('/images/brand-kodak.svg')
    expect(brandLogo('Panasonic')).toBe('/images/brand-panasonic.svg')
  })
  it('returns null for brands without a bundled asset (text fallback)', () => {
    expect(brandLogo('Olympus')).toBeNull()
    expect(brandLogo('Pentax')).toBeNull()
    expect(brandLogo('Casio')).toBeNull()
  })
})

describe('canonicalizeBrand', () => {
  const brands = ['Canon', 'Fujifilm', 'Kodak', 'Nikon', 'Panasonic', 'Sony']
  it('maps a query value to the catalog casing (from=home deep link)', () => {
    expect(canonicalizeBrand('canon', brands)).toBe('Canon')
    expect(canonicalizeBrand('SONY', brands)).toBe('Sony')
  })
  it('returns null for unknown or empty brand', () => {
    expect(canonicalizeBrand('leica', brands)).toBeNull()
    expect(canonicalizeBrand(null, brands)).toBeNull()
    expect(canonicalizeBrand('', brands)).toBeNull()
  })
})

describe('option constants', () => {
  it('rating options are 4..1 & up', () => {
    expect([...RATING_OPTIONS]).toEqual([4, 3, 2, 1])
  })
  it('condition options cover all grades', () => {
    expect(CONDITION_OPTIONS).toEqual(['mint', 'excellent', 'good', 'fair'])
  })
})


// ─── V2: dynamic price bounds ────────────────────────────────────────────────
describe('priceBounds — derived from real catalog, never hardcoded', () => {
  it('floors/ceils the actual min/max to a sensible step', () => {
    // CATALOG prices: 45, 65, 89, 130 → spread 85 → step 5
    const b = priceBounds(CATALOG)
    expect(b.min).toBe(45)
    expect(b.max).toBe(130)
  })
  it('returns 0..0 for an empty catalog', () => {
    expect(priceBounds([])).toEqual({ min: 0, max: 0 })
  })
  it('picks larger steps for larger spreads', () => {
    expect(priceStep(85)).toBe(5)
    expect(priceStep(1500)).toBe(50)
    expect(priceStep(15000)).toBe(500)
  })
})

describe('clampToBounds / normalizePriceAgainstBounds', () => {
  const bounds = { min: 45, max: 130 }
  it('clamps values into range', () => {
    expect(clampToBounds(10, bounds)).toBe(45)
    expect(clampToBounds(999, bounds)).toBe(130)
    expect(clampToBounds(NaN, bounds)).toBe(45)
  })
  it('collapses a full-range selection to null/null (not an active filter)', () => {
    expect(normalizePriceAgainstBounds({ min: 45, max: 130 }, bounds)).toEqual({ min: null, max: null })
  })
  it('keeps a partial range and clamps out-of-range ends', () => {
    expect(normalizePriceAgainstBounds({ min: 60, max: 100 }, bounds)).toEqual({ min: 60, max: 100 })
    expect(normalizePriceAgainstBounds({ min: -5, max: 100 }, bounds)).toEqual({ min: null, max: 100 })
    expect(normalizePriceAgainstBounds({ min: 60, max: 999 }, bounds)).toEqual({ min: 60, max: null })
  })
  it('prevents crossed handles by swapping', () => {
    expect(normalizePriceAgainstBounds({ min: 100, max: 60 }, bounds)).toEqual({ min: 60, max: 100 })
  })
})

// ─── V2: facet counts (real data, respect other groups) ──────────────────────
describe('facet counts', () => {
  const brands = ['Canon', 'Kodak', 'Nikon', 'Sony']
  it('brandCounts reflect the full catalog when no other filters are active', () => {
    const c = brandCounts(CATALOG, EMPTY_FILTERS, RATINGS, brands)
    expect(c).toEqual({ Canon: 1, Kodak: 1, Nikon: 1, Sony: 1 })
  })
  it('brandCounts are NOT limited by the brand group itself, but ARE by other groups', () => {
    // Restrict to in-stock only → nikon-b (stock 0) drops out.
    const c = brandCounts(CATALOG, F({ inStockOnly: true }), RATINGS, brands)
    expect(c.Nikon).toBe(0)
    expect(c.Canon).toBe(1)
  })
  it('conditionCounts reflect the catalog', () => {
    const c = conditionCounts(CATALOG, EMPTY_FILTERS, RATINGS)
    expect(c).toEqual({ mint: 1, excellent: 1, good: 1, fair: 1 })
  })
  it('ratingCounts count "n & up" using real ratings (unrated excluded)', () => {
    const c = ratingCounts(CATALOG, EMPTY_FILTERS, RATINGS)
    // ratings: canon 4.6, nikon 3.2, sony 5.0, kodak unrated
    expect(c[4]).toBe(2) // canon + sony
    expect(c[3]).toBe(3) // canon + nikon + sony
    expect(c[1]).toBe(3) // all rated
  })
})

// ─── V2: pagination ───────────────────────────────────────────────────────────
describe('paginate + clampPage', () => {
  const items = Array.from({ length: 30 }, (_, i) => i + 1)
  it('slices the correct page and reports totals', () => {
    const p1 = paginate(items, 1, 12)
    expect(p1.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(p1.totalPages).toBe(3)
    expect(p1.total).toBe(30)
    const p3 = paginate(items, 3, 12)
    expect(p3.items).toEqual([25, 26, 27, 28, 29, 30])
  })
  it('clamps out-of-range/invalid page requests gracefully', () => {
    expect(paginate(items, 99, 12).page).toBe(3)
    expect(paginate(items, 0, 12).page).toBe(1)
    expect(paginate(items, NaN as unknown as number, 12).page).toBe(1)
    expect(clampPage(5, 3)).toBe(3)
    expect(clampPage(-2, 3)).toBe(1)
  })
  it('default PAGE_SIZE is 12', () => {
    expect(PAGE_SIZE).toBe(12)
  })
})

describe('pageWindow — intelligent ellipsis', () => {
  it('lists all pages when total <= 7', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5])
  })
  it('collapses with a single trailing ellipsis near the start', () => {
    expect(pageWindow(1, 8)).toEqual([1, 2, PAGE_ELLIPSIS, 8])
  })
  it('collapses on both sides in the middle', () => {
    expect(pageWindow(4, 8)).toEqual([1, PAGE_ELLIPSIS, 3, 4, 5, PAGE_ELLIPSIS, 8])
  })
  it('collapses with a single leading ellipsis near the end', () => {
    expect(pageWindow(8, 8)).toEqual([1, PAGE_ELLIPSIS, 7, 8])
  })
})

// ─── Supported extra filters: Megapixels & Release Era (real structured specs) ─
describe('applyFilters — megapixels (real specs.megapixels)', () => {
  it('filters by a single megapixel bucket (>= min, < max)', () => {
    // 5–8 MP band → kodak-d (5) + sony-c (7); canon-a (4) and nikon-b (3) excluded.
    const r = applyFilters(CATALOG, F({ megapixels: ['mp-5-8'] }), RATINGS)
    expect(r.map((p) => p.slug).sort()).toEqual(['kodak-d', 'sony-c'])
  })
  it('ORs multiple megapixel buckets within the group', () => {
    const r = applyFilters(CATALOG, F({ megapixels: ['mp-0-5', 'mp-5-8'] }), RATINGS)
    // Under 5 MP → canon-a(4), nikon-b(3); 5–8 → kodak-d(5), sony-c(7) → all four
    expect(r).toHaveLength(4)
  })
  it('excludes products outside every selected band', () => {
    const r = applyFilters(CATALOG, F({ megapixels: ['mp-12'] }), RATINGS)
    expect(r).toHaveLength(0)
  })
})

describe('applyFilters — release era (real specs.year)', () => {
  it('filters by a single era band (inclusive years)', () => {
    // 2005–2009 → canon-a(2005), kodak-d(2006), sony-c(2007); nikon-b(2004) excluded
    const r = applyFilters(CATALOG, F({ eras: ['era-2005-2009'] }), RATINGS)
    expect(r.map((p) => p.slug).sort()).toEqual(['canon-a', 'kodak-d', 'sony-c'])
  })
  it('ORs multiple era bands within the group', () => {
    const r = applyFilters(CATALOG, F({ eras: ['era-2000-2004', 'era-2005-2009'] }), RATINGS)
    expect(r).toHaveLength(4)
  })
})

describe('megapixel / era options + counts (data-derived, empty bands hidden)', () => {
  it('only surfaces megapixel bands that contain products', () => {
    const ids = megapixelOptions(CATALOG).map((b) => b.id)
    // Present: under-5 (3,4) and 5–8 (5,7). Absent: 8–12 and 12+.
    expect(ids).toEqual(['mp-0-5', 'mp-5-8'])
    expect(ids).not.toContain('mp-8-12')
    expect(ids).not.toContain('mp-12')
  })
  it('megapixelCounts reflect the catalog and respect OTHER groups only', () => {
    const c = megapixelCounts(CATALOG, EMPTY_FILTERS, RATINGS)
    expect(c['mp-0-5']).toBe(2) // 3, 4
    expect(c['mp-5-8']).toBe(2) // 5, 7
    // Restricting to in-stock drops nikon-b (stock 0, 3MP) from under-5.
    const cStock = megapixelCounts(CATALOG, F({ inStockOnly: true }), RATINGS)
    expect(cStock['mp-0-5']).toBe(1) // only canon-a
  })
  it('only surfaces era bands that contain products', () => {
    const ids = eraOptions(CATALOG).map((b) => b.id)
    expect(ids).toEqual(['era-2000-2004', 'era-2005-2009'])
    expect(ids).not.toContain('era-pre2000')
  })
  it('eraCounts reflect the catalog', () => {
    const c = eraCounts(CATALOG, EMPTY_FILTERS, RATINGS)
    expect(c['era-2000-2004']).toBe(1) // nikon-b 2004
    expect(c['era-2005-2009']).toBe(3) // canon-a, kodak-d, sony-c
  })
  it('bucket constants are stable and ordered', () => {
    expect(MEGAPIXEL_BUCKETS.map((b) => b.id)).toEqual(['mp-0-5', 'mp-5-8', 'mp-8-12', 'mp-12'])
    expect(ERA_BUCKETS.map((b) => b.id)).toEqual(['era-pre2000', 'era-2000-2004', 'era-2005-2009', 'era-2010-2014', 'era-2015'])
  })
})

describe('chip labels for megapixels / era', () => {
  it('returns human labels for known ids and echoes unknown ids', () => {
    expect(megapixelLabel('mp-5-8')).toBe('5–8 MP')
    expect(megapixelLabel('nope')).toBe('nope')
    expect(eraLabel('era-2005-2009')).toBe('2005–2009')
    expect(eraLabel('nope')).toBe('nope')
  })
})

describe('hasActiveFilters / activeFilterCount include the new groups', () => {
  it('treats megapixels and eras as active filters', () => {
    expect(hasActiveFilters(F({ megapixels: ['mp-5-8'] }))).toBe(true)
    expect(hasActiveFilters(F({ eras: ['era-2005-2009'] }))).toBe(true)
    const f = F({ brands: ['Canon'], megapixels: ['mp-5-8', 'mp-0-5'], eras: ['era-2005-2009'] })
    // 1 brand + 2 megapixel + 1 era = 4
    expect(activeFilterCount(f)).toBe(4)
  })
})

// ─── Brand → representative PRODUCT image (reuse existing catalog assets) ──────
describe('representativeProductForBrand / brandRepresentativeImages', () => {
  const brands = ['Canon', 'Kodak', 'Nikon', 'Sony']

  it('reuses an EXISTING product image reference for each brand', () => {
    const map = brandRepresentativeImages(CATALOG, brands)
    expect(map).toEqual({
      Canon: '/uploads/canon-a.webp',
      Kodak: '/uploads/kodak-d.webp',
      Nikon: '/uploads/nikon-b.webp',
      Sony: '/uploads/sony-c.webp',
    })
  })

  it('prefers an in-stock unit, then newest year, then slug for determinism', () => {
    const canonCatalog: Product[] = [
      makeProduct({ slug: 'canon-old-instock', brand: 'Canon', stock: 2, image: '/uploads/old.webp', specs: { megapixels: 5, zoom: '3x', storage: 'SD', year: 2004 } }),
      makeProduct({ slug: 'canon-new-oos', brand: 'Canon', stock: 0, image: '/uploads/new.webp', specs: { megapixels: 8, zoom: '3x', storage: 'SD', year: 2009 } }),
    ]
    // In-stock wins over newer-but-out-of-stock.
    expect(representativeProductForBrand(canonCatalog, 'Canon')?.image).toBe('/uploads/old.webp')
  })

  it('returns null / omits brands that have no products', () => {
    expect(representativeProductForBrand(CATALOG, 'Olympus')).toBeNull()
    const map = brandRepresentativeImages(CATALOG, ['Olympus'])
    expect(map).toEqual({})
  })
})
