/**
 * Catalog filtering — pure, centralized logic for the Cameras page (`/products`).
 *
 * Keeping this framework-free means the desktop sidebar, the mobile drawer, the
 * active-filter chips, and the tests all operate on ONE implementation, so the
 * two surfaces can never diverge. It has no React/Next imports.
 *
 * Data notes:
 *  - Brands, price, and condition come straight off the `Product` records.
 *  - Ratings are REAL: the caller supplies a per-slug average computed from the
 *    review store (see `ratingBySlug`). Products with no reviews have no rating
 *    and are excluded only when a minimum-rating filter is active.
 */

import type { ConditionGrade, Product } from '@/types'

export type SortOption = 'newest' | 'price-asc' | 'price-desc' | 'rating-desc'

/** Minimum-rating options offered by the Rating filter (stars & up). */
export const RATING_OPTIONS = [4, 3, 2, 1] as const
export type MinRating = (typeof RATING_OPTIONS)[number]

export const CONDITION_OPTIONS: ConditionGrade[] = ['mint', 'excellent', 'good', 'fair']

/**
 * Sentinel for "no bound". The catalog uses explicit null rather than a magic
 * number so an unset price bound never accidentally excludes products.
 */
export interface PriceRange {
  /** Inclusive minimum, or null for "no minimum". */
  min: number | null
  /** Inclusive maximum, or null for "no maximum". */
  max: number | null
}

/**
 * Megapixel buckets. These map directly onto the REAL `specs.megapixels` field
 * (a structured Float on every Product), so they never fabricate a spec that
 * the catalog doesn't have. A product falls in a bucket when its megapixels are
 * >= `min` and (if set) < `max`.
 */
export interface MegapixelBucket {
  /** Stable id used in filter state, chips, and the URL. */
  id: string
  /** Human label, e.g. "Under 5 MP", "5–8 MP", "12 MP+". */
  label: string
  /** Inclusive lower bound (MP). */
  min: number
  /** Exclusive upper bound (MP), or null for "and up". */
  max: number | null
}

/**
 * Fixed, sensible megapixel bands for compact vintage digicams. Only the bands
 * that ACTUALLY contain products are ever shown (see {@link megapixelOptions}),
 * so an empty band never appears. The bands themselves are not per-catalog
 * magic numbers — they are the standard resolution tiers of the digicam era.
 */
export const MEGAPIXEL_BUCKETS: MegapixelBucket[] = [
  { id: 'mp-0-5', label: 'Under 5 MP', min: 0, max: 5 },
  { id: 'mp-5-8', label: '5–8 MP', min: 5, max: 8 },
  { id: 'mp-8-12', label: '8–12 MP', min: 8, max: 12 },
  { id: 'mp-12', label: '12 MP & up', min: 12, max: null },
]

const MEGAPIXEL_BY_ID: Record<string, MegapixelBucket> = Object.fromEntries(
  MEGAPIXEL_BUCKETS.map((b) => [b.id, b])
)

/** True when `mp` falls inside the given bucket (>= min, < max when max is set). */
function inMegapixelBucket(mp: number, bucket: MegapixelBucket): boolean {
  if (mp < bucket.min) return false
  if (bucket.max !== null && mp >= bucket.max) return false
  return true
}

/**
 * Release-era bands built from the REAL `specs.year` field. Vintage digicams
 * cluster by half-decade, which matches how collectors shop ("mid-2000s").
 * Bands with no products are hidden (see {@link eraOptions}).
 */
export interface EraBucket {
  id: string
  label: string
  /** Inclusive start year. */
  from: number
  /** Inclusive end year, or null for "and newer". */
  to: number | null
}

export const ERA_BUCKETS: EraBucket[] = [
  { id: 'era-pre2000', label: 'Pre-2000', from: 0, to: 1999 },
  { id: 'era-2000-2004', label: '2000–2004', from: 2000, to: 2004 },
  { id: 'era-2005-2009', label: '2005–2009', from: 2005, to: 2009 },
  { id: 'era-2010-2014', label: '2010–2014', from: 2010, to: 2014 },
  { id: 'era-2015', label: '2015 & newer', from: 2015, to: null },
]

const ERA_BY_ID: Record<string, EraBucket> = Object.fromEntries(ERA_BUCKETS.map((b) => [b.id, b]))

/** True when `year` falls inside the given era band. */
function inEraBucket(year: number, bucket: EraBucket): boolean {
  if (year < bucket.from) return false
  if (bucket.to !== null && year > bucket.to) return false
  return true
}

export interface CatalogFilters {
  brands: string[]
  conditions: ConditionGrade[]
  price: PriceRange
  /** Minimum average rating (stars & up), or null for "any rating". */
  minRating: MinRating | null
  inStockOnly: boolean
  /** Selected megapixel bucket ids (OR within the group). Real `specs.megapixels`. */
  megapixels: string[]
  /** Selected release-era bucket ids (OR within the group). Real `specs.year`. */
  eras: string[]
}

export const EMPTY_FILTERS: CatalogFilters = {
  brands: [],
  conditions: [],
  price: { min: null, max: null },
  minRating: null,
  inStockOnly: false,
  megapixels: [],
  eras: [],
}

/** True when any customer-controlled filter is active (sort is NOT a filter). */
export function hasActiveFilters(f: CatalogFilters): boolean {
  return (
    f.brands.length > 0 ||
    f.conditions.length > 0 ||
    f.price.min !== null ||
    f.price.max !== null ||
    f.minRating !== null ||
    f.inStockOnly ||
    f.megapixels.length > 0 ||
    f.eras.length > 0
  )
}

/** Count of distinct active filter groups (for the mobile "Filters (N)" badge). */
export function activeFilterCount(f: CatalogFilters): number {
  return (
    f.brands.length +
    f.conditions.length +
    (f.price.min !== null || f.price.max !== null ? 1 : 0) +
    (f.minRating !== null ? 1 : 0) +
    (f.inStockOnly ? 1 : 0) +
    f.megapixels.length +
    f.eras.length
  )
}

/** Map of product slug → real average rating (0 if unrated). */
export type RatingBySlug = Record<string, number>

/**
 * Apply all active filters to a product list. `ratingBySlug` supplies real
 * per-product averages; when a `minRating` filter is set, unrated products are
 * excluded (we never invent a rating for them).
 */
export function applyFilters(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug = {}
): Product[] {
  return products.filter((p) => {
    if (filters.brands.length > 0 && !filters.brands.includes(p.brand)) return false
    if (filters.conditions.length > 0 && !filters.conditions.includes(p.condition)) return false
    if (filters.price.min !== null && p.price < filters.price.min) return false
    if (filters.price.max !== null && p.price > filters.price.max) return false
    if (filters.inStockOnly && Math.max(0, p.stock) <= 0) return false
    if (filters.minRating !== null) {
      const r = ratingBySlug[p.slug] ?? 0
      if (r < filters.minRating) return false
    }
    if (filters.megapixels.length > 0) {
      const mp = p.specs.megapixels
      const match = filters.megapixels.some((id) => {
        const b = MEGAPIXEL_BY_ID[id]
        return b ? inMegapixelBucket(mp, b) : false
      })
      if (!match) return false
    }
    if (filters.eras.length > 0) {
      const year = p.specs.year
      const match = filters.eras.some((id) => {
        const b = ERA_BY_ID[id]
        return b ? inEraBucket(year, b) : false
      })
      if (!match) return false
    }
    return true
  })
}

/** Sort a product list (does not mutate the input). */
export function sortProducts(
  products: Product[],
  sort: SortOption,
  ratingBySlug: RatingBySlug = {}
): Product[] {
  const result = [...products]
  switch (sort) {
    case 'price-asc':
      result.sort((a, b) => a.price - b.price)
      break
    case 'price-desc':
      result.sort((a, b) => b.price - a.price)
      break
    case 'rating-desc':
      result.sort((a, b) => (ratingBySlug[b.slug] ?? 0) - (ratingBySlug[a.slug] ?? 0))
      break
    case 'newest':
    default:
      result.sort((a, b) => b.specs.year - a.specs.year)
      break
  }
  return result
}

// ─── Price input parsing & validation ────────────────────────────────────────

export interface PriceValidation {
  price: PriceRange
  error: string | null
}

/**
 * Parse raw min/max text-field values into a validated {@link PriceRange}.
 *
 * Rules:
 *  - Empty string → that bound is null (unset), which is allowed.
 *  - Negative or non-numeric input → error, bound treated as unset.
 *  - min > max → error; the range is normalized by swapping so results are still
 *    sensible rather than empty.
 */
export function parsePriceRange(rawMin: string, rawMax: string): PriceValidation {
  const parse = (raw: string): { value: number | null; bad: boolean } => {
    const t = raw.trim()
    if (t === '') return { value: null, bad: false }
    const n = Number(t)
    if (!Number.isFinite(n) || n < 0) return { value: null, bad: true }
    return { value: n, bad: false }
  }

  const min = parse(rawMin)
  const max = parse(rawMax)

  if (min.bad || max.bad) {
    return { price: { min: null, max: null }, error: 'Enter valid, non-negative amounts.' }
  }

  if (min.value !== null && max.value !== null && min.value > max.value) {
    // Normalize by swapping so the customer still sees a usable range,
    // but surface a gentle notice.
    return { price: { min: max.value, max: min.value }, error: 'Minimum was higher than maximum — we swapped them.' }
  }

  return { price: { min: min.value, max: max.value }, error: null }
}

// ─── Brand logo assets (only brands that genuinely have an asset) ────────────
// These SVGs exist in /public/images. Brands present in the catalog but WITHOUT
// an asset here fall back to a professional text treatment in the UI — we never
// ship an incorrect/unofficial logo.

const BRAND_LOGO_REGISTRY: Record<string, string> = {
  canon: '/images/brand-canon.svg',
  nikon: '/images/brand-nikon.svg',
  sony: '/images/brand-sony.svg',
  fujifilm: '/images/brand-fujifilm.svg',
  kodak: '/images/brand-kodak.svg',
  panasonic: '/images/brand-panasonic.svg',
}

/** Return the logo asset path for a brand, or null if none exists (use text). */
export function brandLogo(brand: string): string | null {
  return BRAND_LOGO_REGISTRY[brand.trim().toLowerCase()] ?? null
}

/** Normalize a `?brand=` query value to the catalog's canonical casing. */
export function canonicalizeBrand(raw: string | null | undefined, brands: string[]): string | null {
  if (!raw) return null
  const lower = raw.trim().toLowerCase()
  return brands.find((b) => b.toLowerCase() === lower) ?? null
}

// ─── Brand → representative PRODUCT image (reuse existing catalog assets) ─────
// "Shop cameras by brand" reuses the SAME image references RePXL product cards
// already render — no new brand-sample assets are invented. We pick a stable,
// representative product per brand straight from the catalog data and use its
// `image`. The product→brand relationship is trusted as-is; no image is opened,
// analyzed, or converted.

/**
 * Choose the representative product for a brand: prefer in-stock units, then the
 * newest by release year, breaking ties by slug for determinism. Returns the
 * whole product so callers can use its real `image`, `name`, etc.
 */
export function representativeProductForBrand(products: Product[], brand: string): Product | null {
  const inBrand = products.filter((p) => p.brand === brand)
  if (inBrand.length === 0) return null
  const ranked = [...inBrand].sort((a, b) => {
    const aStock = Math.max(0, a.stock) > 0 ? 1 : 0
    const bStock = Math.max(0, b.stock) > 0 ? 1 : 0
    if (aStock !== bStock) return bStock - aStock // in-stock first
    if (b.specs.year !== a.specs.year) return b.specs.year - a.specs.year // newest first
    return a.slug.localeCompare(b.slug) // stable tie-break
  })
  return ranked[0]
}

/**
 * Map of brand → the existing product `image` reference to feature in the brand
 * selector. Only brands that have at least one product appear. Every value is an
 * image path already used successfully by a RePXL product card.
 */
export function brandRepresentativeImages(products: Product[], brands: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const brand of brands) {
    const rep = representativeProductForBrand(products, brand)
    if (rep?.image) out[brand] = rep.image
  }
  return out
}


// ─── Dynamic price bounds (from real catalog data) ──────────────────────────

export interface PriceBounds {
  min: number
  max: number
}

/**
 * Derive the price slider's floor/ceiling from the ACTUAL catalog, floored/
 * ceiled to a sensible step so the handles land on round pesos. Never hardcoded.
 * Falls back to a 0..0 range for an empty catalog (caller can hide the slider).
 */
export function priceBounds(products: Product[]): PriceBounds {
  if (products.length === 0) return { min: 0, max: 0 }
  let lo = Infinity
  let hi = -Infinity
  for (const p of products) {
    if (p.price < lo) lo = p.price
    if (p.price > hi) hi = p.price
  }
  const step = priceStep(hi - lo)
  return {
    min: Math.max(0, Math.floor(lo / step) * step),
    max: Math.ceil(hi / step) * step,
  }
}

/** Sensible peso step based on the spread of prices in the catalog. */
export function priceStep(spread: number): number {
  if (spread <= 0) return 1
  if (spread <= 200) return 5
  if (spread <= 2000) return 50
  if (spread <= 20000) return 500
  return 1000
}

/** Clamp a value into [min,max]; returns min for non-finite input. */
export function clampToBounds(value: number, bounds: PriceBounds): number {
  if (!Number.isFinite(value)) return bounds.min
  return Math.min(bounds.max, Math.max(bounds.min, value))
}

/**
 * Normalize a draft price range against the catalog bounds:
 *  - clamps both ends into [bounds.min, bounds.max]
 *  - prevents the handles from crossing (min never above max)
 *  - collapses a full-range selection back to null/null so it is not treated as
 *    an active filter or shown as a chip.
 */
export function normalizePriceAgainstBounds(price: PriceRange, bounds: PriceBounds): PriceRange {
  let min = price.min === null ? bounds.min : clampToBounds(price.min, bounds)
  let max = price.max === null ? bounds.max : clampToBounds(price.max, bounds)
  if (min > max) [min, max] = [max, min]
  return {
    min: min <= bounds.min ? null : min,
    max: max >= bounds.max ? null : max,
  }
}

// ─── Facet counts (respect the OTHER active filters) ─────────────────────────
// Each count shows how many products would match if that value were selected,
// given the currently-active filters in the OTHER groups (standard e-commerce
// facet behavior). All counts derive from real catalog + real ratings.

/** Filters with one group omitted (so that group's own facet counts aren't self-limited). */
function without(filters: CatalogFilters, group: keyof CatalogFilters): CatalogFilters {
  return { ...filters, [group]: EMPTY_FILTERS[group] }
}

export function brandCounts(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug,
  brands: string[]
): Record<string, number> {
  const base = applyFilters(products, without(filters, 'brands'), ratingBySlug)
  const counts: Record<string, number> = {}
  for (const b of brands) counts[b] = 0
  for (const p of base) counts[p.brand] = (counts[p.brand] ?? 0) + 1
  return counts
}

export function conditionCounts(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug
): Record<ConditionGrade, number> {
  const base = applyFilters(products, without(filters, 'conditions'), ratingBySlug)
  const counts = { mint: 0, excellent: 0, good: 0, fair: 0 } as Record<ConditionGrade, number>
  for (const p of base) counts[p.condition] = (counts[p.condition] ?? 0) + 1
  return counts
}

export function ratingCounts(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug
): Record<MinRating, number> {
  const base = applyFilters(products, without(filters, 'minRating'), ratingBySlug)
  const counts = { 4: 0, 3: 0, 2: 0, 1: 0 } as Record<MinRating, number>
  for (const p of base) {
    const r = ratingBySlug[p.slug] ?? 0
    for (const opt of RATING_OPTIONS) if (r >= opt) counts[opt] += 1
  }
  return counts
}

/**
 * Megapixel buckets that actually contain at least one product in the FULL
 * catalog. Empty bands are hidden so the UI never offers a resolution tier that
 * yields zero results. Never fabricates a band.
 */
export function megapixelOptions(products: Product[]): MegapixelBucket[] {
  return MEGAPIXEL_BUCKETS.filter((b) => products.some((p) => inMegapixelBucket(p.specs.megapixels, b)))
}

export function megapixelCounts(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug
): Record<string, number> {
  const base = applyFilters(products, without(filters, 'megapixels'), ratingBySlug)
  const counts: Record<string, number> = {}
  for (const b of MEGAPIXEL_BUCKETS) counts[b.id] = 0
  for (const p of base) {
    for (const b of MEGAPIXEL_BUCKETS) if (inMegapixelBucket(p.specs.megapixels, b)) counts[b.id] += 1
  }
  return counts
}

/**
 * Release-era bands that actually contain products in the FULL catalog. Empty
 * bands are hidden. Never fabricates a band.
 */
export function eraOptions(products: Product[]): EraBucket[] {
  return ERA_BUCKETS.filter((b) => products.some((p) => inEraBucket(p.specs.year, b)))
}

export function eraCounts(
  products: Product[],
  filters: CatalogFilters,
  ratingBySlug: RatingBySlug
): Record<string, number> {
  const base = applyFilters(products, without(filters, 'eras'), ratingBySlug)
  const counts: Record<string, number> = {}
  for (const b of ERA_BUCKETS) counts[b.id] = 0
  for (const p of base) {
    for (const b of ERA_BUCKETS) if (inEraBucket(p.specs.year, b)) counts[b.id] += 1
  }
  return counts
}

/** Human label for a megapixel bucket id (for active-filter chips). */
export function megapixelLabel(id: string): string {
  return MEGAPIXEL_BY_ID[id]?.label ?? id
}

/** Human label for an era bucket id (for active-filter chips). */
export function eraLabel(id: string): string {
  return ERA_BY_ID[id]?.label ?? id
}

// ─── Pagination (operates on the FILTERED + SORTED result set) ───────────────

export const PAGE_SIZE = 12

export interface PageInfo<T> {
  items: T[]
  page: number
  totalPages: number
  total: number
}

/** Clamp a requested page into [1, totalPages]; invalid input → page 1. */
export function clampPage(requested: number, totalPages: number): number {
  const t = Math.max(1, totalPages)
  if (!Number.isFinite(requested) || requested < 1) return 1
  return Math.min(Math.floor(requested), t)
}

/** Slice a result set into the current page (clamps out-of-range gracefully). */
export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE): PageInfo<T> {
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total / size))
  const current = clampPage(page, totalPages)
  const start = (current - 1) * size
  return { items: items.slice(start, start + size), page: current, totalPages, total }
}

/** Sentinel for an ellipsis gap in the page window. */
export const PAGE_ELLIPSIS = '…' as const

/**
 * Compact page-number window with intelligent ellipsis, e.g.
 *   current=1, total=8  → [1,2,3,'…',8]
 *   current=4, total=8  → [1,'…',3,4,5,'…',8]
 *   total<=7            → [1..total]
 */
export function pageWindow(current: number, totalPages: number): (number | typeof PAGE_ELLIPSIS)[] {
  const total = Math.max(1, totalPages)
  const cur = clampPage(current, total)
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | typeof PAGE_ELLIPSIS)[] = [1]
  const left = Math.max(2, cur - 1)
  const right = Math.min(total - 1, cur + 1)

  if (left > 2) pages.push(PAGE_ELLIPSIS)
  for (let p = left; p <= right; p++) pages.push(p)
  if (right < total - 1) pages.push(PAGE_ELLIPSIS)

  pages.push(total)
  return pages
}
