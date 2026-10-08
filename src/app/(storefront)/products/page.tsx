'use client'

import { Suspense, useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { Button, FeedbackState, PageBackLink, Skeleton } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { BrandSelector } from '@/components/product/catalog/BrandSelector'
import { CatalogToolbar } from '@/components/product/catalog/CatalogToolbar'
import { FilterSidebar } from '@/components/product/catalog/FilterSidebar'
import { MobileFilterDrawer } from '@/components/product/catalog/MobileFilterDrawer'
import { ActiveFilterChips } from '@/components/product/catalog/ActiveFilterChips'
import { CatalogEmptyState } from '@/components/product/catalog/CatalogEmptyState'
import { Pagination } from '@/components/product/catalog/Pagination'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useThemeStore } from '@/stores/themeStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { hasHomeNavContext } from '@/lib/back-navigation'
import {
  applyFilters,
  sortProducts,
  hasActiveFilters,
  activeFilterCount as countActiveFilters,
  canonicalizeBrand,
  priceBounds,
  conditionCounts as computeConditionCounts,
  ratingCounts as computeRatingCounts,
  megapixelOptions as computeMegapixelOptions,
  megapixelCounts as computeMegapixelCounts,
  eraOptions as computeEraOptions,
  eraCounts as computeEraCounts,
  paginate,
  clampPage,
  PAGE_SIZE,
  EMPTY_FILTERS,
  type CatalogFilters,
  type SortOption,
  type MinRating,
  type PriceRange,
  type RatingBySlug,
} from '@/lib/catalog-filters'
import { aggregateRatings } from '@/lib/rating-aggregate'
import type { ConditionGrade } from '@/types'

function ProductsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { fadeUp, staggerContainer, reducedMotion } = useRevealAnimation()
  const allProducts = useProductStore((s) => s.products)
  const productLoading = useProductStore((s) => s.loading)
  const productError = useProductStore((s) => s.error)
  const allReviews = useReviewStore((s) => s.reviews)
  const [hydrated, setHydrated] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const resultsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const hasProducts = useProductStore.getState().products.length > 0
    const p = hasProducts ? Promise.resolve() : useProductStore.getState().hydrate()
    void useReviewStore.getState().hydrate()
    p.finally(() => setHydrated(true))
  }, [])

  const retryProducts = () => {
    setHydrated(false)
    void useProductStore.getState().hydrate().finally(() => setHydrated(true))
  }

  // from=home contextual Back — URL-derived; never mutated by filter/sort/page ops.
  const cameFromHome = hasHomeNavContext(searchParams)

  const products = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts])
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products])
  const bounds = useMemo(() => priceBounds(products), [products])

  // Real per-product average rating from the review store (0 when unrated).
  // Uses the centralized aggregation so the catalog, ProductCard, PDP, and
  // Compare all agree on a product's average.
  const ratingBySlug: RatingBySlug = useMemo(() => {
    const bySlug: Record<string, typeof allReviews> = {}
    for (const r of allReviews) (bySlug[r.productSlug] ??= []).push(r)
    const out: RatingBySlug = {}
    for (const slug of Object.keys(bySlug)) out[slug] = aggregateRatings(bySlug[slug]).average
    return out
  }, [allReviews])

  // ── Centralized filter + sort + page state ──
  const initialBrand = canonicalizeBrand(searchParams.get('brand'), brands)
  const [filters, setFilters] = useState<CatalogFilters>({
    ...EMPTY_FILTERS,
    brands: initialBrand ? [initialBrand] : [],
  })
  const [sort, setSort] = useState<SortOption>('newest')
  const initialPage = Number(searchParams.get('page') ?? '1')
  const [page, setPage] = useState<number>(Number.isFinite(initialPage) && initialPage > 0 ? Math.floor(initialPage) : 1)

  // Apply a ?brand= deep link once the catalog (and thus canonical brands) loads.
  useEffect(() => {
    const b = canonicalizeBrand(searchParams.get('brand'), brands)
    if (b && filters.brands.length === 0) setFilters((f) => ({ ...f, brands: [b] }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brands])

  // Reflect page in the URL without discarding compatible params (brand/from/sort).
  const writePageToUrl = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(searchParams.toString())
      if (nextPage <= 1) params.delete('page')
      else params.set('page', String(nextPage))
      const qs = params.toString()
      router.replace(qs ? `/products?${qs}` : '/products', { scroll: false })
    },
    [router, searchParams]
  )

  // ── Filter mutators — every change resets to page 1 (per spec) ──
  const resetPage = () => setPage(1)
  const withReset =
    <A extends unknown[]>(fn: (...args: A) => void) =>
    (...args: A) => {
      fn(...args)
      resetPage()
      writePageToUrl(1)
    }

  // Brand is controlled ONLY by the "Shop cameras by brand" selector and the
  // active-filter chip — there is a single centralized brand-filter state.
  // `selectBrand` sets/clears the (single) selected brand; the chip's remove
  // action clears it via selectBrand(null).
  const selectBrand = withReset((brand: string | null) => setFilters((f) => ({ ...f, brands: brand ? [brand] : [] })))
  const toggleCondition = withReset((c: ConditionGrade) =>
    setFilters((f) => ({ ...f, conditions: f.conditions.includes(c) ? f.conditions.filter((x) => x !== c) : [...f.conditions, c] }))
  )
  const setMinRating = withReset((r: MinRating | null) => setFilters((f) => ({ ...f, minRating: r })))
  const setInStockOnly = withReset((v: boolean) => setFilters((f) => ({ ...f, inStockOnly: v })))
  const toggleMegapixel = withReset((id: string) =>
    setFilters((f) => ({ ...f, megapixels: f.megapixels.includes(id) ? f.megapixels.filter((x) => x !== id) : [...f.megapixels, id] }))
  )
  const toggleEra = withReset((id: string) =>
    setFilters((f) => ({ ...f, eras: f.eras.includes(id) ? f.eras.filter((x) => x !== id) : [...f.eras, id] }))
  )
  const applyPrice = withReset((price: PriceRange) => setFilters((f) => ({ ...f, price })))
  const changeSort = withReset((s: SortOption) => setSort(s))
  // Clear All resets customer filters; preserves sort and from=home (URL untouched beyond page).
  const clearAll = withReset(() => setFilters(EMPTY_FILTERS))

  // ── FILTER → SORT → PAGINATE ──
  const filteredSorted = useMemo(() => {
    const matched = applyFilters(products, filters, ratingBySlug)
    return sortProducts(matched, sort, ratingBySlug)
  }, [products, filters, sort, ratingBySlug])

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const safePage = clampPage(page, totalPages)
  const pageData = useMemo(() => paginate(filteredSorted, safePage, PAGE_SIZE), [filteredSorted, safePage])

  // Keep state + URL consistent if the current page falls out of range
  // (e.g. after filtering reduced the result count).
  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
      writePageToUrl(safePage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage])

  const goToPage = (next: number) => {
    const clamped = clampPage(next, totalPages)
    setPage(clamped)
    writePageToUrl(clamped)
    // Scroll to the start of the results, not the very top of the site.
    resultsRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
  }

  // ── Facet counts + data-derived options (real data, respecting other active filters) ──
  const conditionCounts = useMemo(() => computeConditionCounts(products, filters, ratingBySlug), [products, filters, ratingBySlug])
  const ratingCounts = useMemo(() => computeRatingCounts(products, filters, ratingBySlug), [products, filters, ratingBySlug])
  const megapixelOptions = useMemo(() => computeMegapixelOptions(products), [products])
  const megapixelCounts = useMemo(() => computeMegapixelCounts(products, filters, ratingBySlug), [products, filters, ratingBySlug])
  const eraOptions = useMemo(() => computeEraOptions(products), [products])
  const eraCounts = useMemo(() => computeEraCounts(products, filters, ratingBySlug), [products, filters, ratingBySlug])

  const hasFilters = hasActiveFilters(filters)
  const activeCount = countActiveFilters(filters)
  const selectedBrandForSelector = filters.brands.length === 1 ? filters.brands[0] : null

  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  const sidebarProps = {
    filters,
    hasFilters,
    bounds,
    conditionCounts,
    ratingCounts,
    megapixelOptions,
    megapixelCounts,
    eraOptions,
    eraCounts,
    onToggleCondition: toggleCondition,
    onSetMinRating: setMinRating,
    onSetInStockOnly: setInStockOnly,
    onToggleMegapixel: toggleMegapixel,
    onToggleEra: toggleEra,
    onApplyPrice: applyPrice,
    onClearAll: clearAll,
  }

  return (
    <div className={`burn-minimal relative min-h-screen overflow-hidden ${isLight ? 'bg-transparent' : 'bg-[#080709]'} pb-20 pt-24`}>
      <div className={`pointer-events-none absolute -left-72 top-1/3 h-[700px] w-[500px] -translate-y-1/2 rounded-full ${isLight ? 'bg-repixl-red/[0.03]' : 'bg-repixl-red/[0.08]'} blur-[150px]`} aria-hidden="true" />
      <div className={`pointer-events-none absolute -right-72 top-2/3 h-[700px] w-[500px] -translate-y-1/2 rounded-full ${isLight ? 'bg-repixl-red/[0.03]' : 'bg-repixl-red/[0.08]'} blur-[150px]`} aria-hidden="true" />

      <Container className="relative z-10">
        {/* Contextual Back — only when arriving from a homepage promo (from=home). */}
        {cameFromHome && <PageBackLink href="/" label="Home" />}

        {/* Heading / intro — centered editorial header */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mx-auto max-w-2xl text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-repixl-muted">The Collection</span>
          <h1 className="mt-3 font-display text-display-lg text-repixl-text-light">All Cameras</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-repixl-muted">
            Every RePXL camera is condition-graded and serial-verified. Browse the archive, or filter by brand,
            price, condition, and customer rating to find your next shooter.
          </p>
        </motion.div>

        {/* Centered brand discovery */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: reducedMotion ? 0 : 0.05 }} className="mt-12">
          <BrandSelector brands={brands} products={products} selectedBrand={selectedBrandForSelector} onSelectBrand={selectBrand} />
        </motion.div>

        {/* Results anchor for pagination scroll */}
        <div ref={resultsRef} className="scroll-mt-24" />

        <div className="flex flex-col gap-10 lg:flex-row">
          {/* Desktop filter sidebar (left) — light, no enclosing box */}
          <motion.aside
            variants={fadeUp} initial="hidden" animate="show" transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="hidden w-64 shrink-0 lg:block"
          >
            <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pb-4">
              <FilterSidebar {...sidebarProps} />
            </div>
          </motion.aside>

          {/* Product grid (right) */}
          <section aria-labelledby="camera-results-heading" className="min-w-0 flex-1">
            <div className="sticky top-16 z-20 -mx-2 bg-repixl-bg/95 px-2 py-3 backdrop-blur-md lg:top-20">
              <CatalogToolbar
                count={filteredSorted.length}
                sort={sort}
                onSortChange={changeSort}
                onOpenFilters={() => setMobileFiltersOpen(true)}
                activeFilterCount={activeCount}
              />
            </div>

            <h2 id="camera-results-heading" className="sr-only">Camera results</h2>

            <div className="mt-5">
              <ActiveFilterChips
                filters={filters}
                onRemoveBrand={() => selectBrand(null)}
                onRemoveCondition={(c) => toggleCondition(c)}
                onRemovePrice={() => applyPrice({ min: null, max: null })}
                onRemoveRating={() => setMinRating(null)}
                onRemoveInStock={() => setInStockOnly(false)}
                onRemoveMegapixel={(id) => toggleMegapixel(id)}
                onRemoveEra={(id) => toggleEra(id)}
                onClearAll={clearAll}
              />
            </div>

            {!hydrated || productLoading ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-6 w-16" /><Skeleton className="h-3 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : productError ? (
              <FeedbackState
                kind="error"
                title="We couldn't load the camera collection"
                message="The collection is temporarily unavailable. Please try again, or return to the collection later."
                action={<Button type="button" variant="primary" size="sm" onClick={retryProducts}>Try again</Button>}
              />
            ) : pageData.total > 0 ? (
              <>
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  key={`${filters.brands.join()}-${filters.conditions.join()}-${filters.price.min}-${filters.price.max}-${filters.minRating}-${filters.inStockOnly}-${sort}-${safePage}`}
                  className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {pageData.items.map((product, index) => (
                    <motion.div key={product.slug} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }} className="h-full">
                      <ProductCard product={product} variant={index} />
                    </motion.div>
                  ))}
                </motion.div>

                <Pagination page={pageData.page} totalPages={pageData.totalPages} onPageChange={goToPage} />
              </>
            ) : (
              <CatalogEmptyState onClearFilters={clearAll} hasFilters={hasFilters} />
            )}
          </section>
        </div>
      </Container>

      {/* Mobile filter drawer — same FilterSidebar, so behavior can't diverge */}
      <MobileFilterDrawer
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        resultCount={filteredSorted.length}
        {...sidebarProps}
      />
    </div>
  )
}

export default function ProductsPage() {
  return (
    <>
      <Suspense fallback={
        <div className="burn-subtle min-h-screen pb-20 pt-24">
          <Container><FeedbackState kind="loading" title="Loading the camera collection" message="Preparing the archive…" /></Container>
        </div>
      }>
        <ProductsContent />
      </Suspense>
      <Footer />
    </>
  )
}
