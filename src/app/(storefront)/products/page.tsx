'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { ConditionBadge, Skeleton } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useProductStore } from '@/stores/productStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ConditionGrade } from '@/types'

const conditions: ConditionGrade[] = ['mint', 'excellent', 'good', 'fair']
type SortOption = 'price-asc' | 'price-desc' | 'newest'

// ─── Shared filter panel — renders inside sidebar (desktop) or drawer (mobile) ─
function FilterPanel({
  brands, selectedBrands, toggleBrand,
  selectedConditions, toggleCondition,
  priceRange, setPriceRange,
  inStockOnly, setInStockOnly,
  hasFilters, clearAll,
}: {
  brands: string[]
  selectedBrands: string[]
  toggleBrand: (b: string) => void
  selectedConditions: ConditionGrade[]
  toggleCondition: (c: ConditionGrade) => void
  priceRange: [number, number]
  setPriceRange: (r: [number, number]) => void
  inStockOnly: boolean
  setInStockOnly: (v: boolean) => void
  hasFilters: boolean
  clearAll: () => void
}) {
  const ck = 'h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-repixl-red/30'
  return (
    <div className="space-y-6">
      <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Filters</p>

      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">Availability</h3>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/80 hover:text-repixl-text-light">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className={ck} />
          In stock only
        </label>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">Brand</h3>
        <ul className="space-y-2.5">
          {brands.map((brand) => (
            <li key={brand}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/80 hover:text-repixl-text-light">
                <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className={ck} />
                {brand}
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">Condition</h3>
        <ul className="space-y-2.5">
          {conditions.map((condition) => (
            <li key={condition}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={selectedConditions.includes(condition)} onChange={() => toggleCondition(condition)} className={ck} />
                <ConditionBadge condition={condition} />
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">Price range</h3>
        <div className="flex items-center gap-2">
          <input type="number" min={0} max={priceRange[1]} value={priceRange[0]}
            onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} aria-label="Minimum price"
            className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-2 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none" />
          <span className="text-xs text-repixl-muted">—</span>
          <input type="number" min={priceRange[0]} max={999} value={priceRange[1]}
            onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} aria-label="Maximum price"
            className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-2 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none" />
        </div>
      </div>

      {hasFilters && (
        <button type="button" onClick={clearAll}
          className="w-full rounded border border-repixl-muted/20 py-2 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-red/40 hover:text-repixl-red">
          Clear all filters
        </button>
      )}
    </div>
  )
}

// ─── Main content ──────────────────────────────────────────────────────────────
function ProductsContent() {
  const searchParams = useSearchParams()
  const { fadeUp, staggerContainer, staggerItem, reducedMotion } = useRevealAnimation()
  const reducedMotionPref = useReducedMotion()
  const allProducts = useProductStore((s) => s.products)
  const [hydrated, setHydrated] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  useEffect(() => {
    useProductStore.getState().hydrate().finally(() => setHydrated(true))
  }, [])

  const products = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts])
  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products])

  const initialBrand = searchParams.get('brand') ?? ''
  const [selectedBrands, setSelectedBrands] = useState<string[]>(
    initialBrand ? [initialBrand.charAt(0).toUpperCase() + initialBrand.slice(1)] : []
  )
  const [selectedConditions, setSelectedConditions] = useState<ConditionGrade[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 9999])
  const [sort, setSort] = useState<SortOption>('newest')
  const [inStockOnly, setInStockOnly] = useState(false)

  const toggleBrand = (brand: string) =>
    setSelectedBrands((prev) => prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand])
  const toggleCondition = (condition: ConditionGrade) =>
    setSelectedConditions((prev) => prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition])

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false
      if (p.price < priceRange[0] || p.price > priceRange[1]) return false
      const stock = Math.max(0, p.stock)
      if (inStockOnly && stock <= 0) return false
      return true
    })
    switch (sort) {
      case 'price-asc': result = [...result].sort((a, b) => a.price - b.price); break
      case 'price-desc': result = [...result].sort((a, b) => b.price - a.price); break
      case 'newest': result = [...result].sort((a, b) => b.specs.year - a.specs.year); break
    }
    return result
  }, [selectedBrands, selectedConditions, priceRange, sort, inStockOnly, products])

  const hasFilters = selectedBrands.length > 0 || selectedConditions.length > 0 || priceRange[0] > 0 || priceRange[1] < 9999 || inStockOnly
  const activeFilterCount = selectedBrands.length + selectedConditions.length + (inStockOnly ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 9999 ? 1 : 0)

  const clearAll = () => {
    setSelectedBrands([])
    setSelectedConditions([])
    setPriceRange([0, 9999])
    setInStockOnly(false)
  }

  const filterProps = { brands, selectedBrands, toggleBrand, selectedConditions, toggleCondition, priceRange, setPriceRange, inStockOnly, setInStockOnly, hasFilters, clearAll }

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        {/* Page header */}
        <motion.div variants={fadeUp} initial="hidden" animate="show"
          className="mb-8 border-b border-repixl-muted/10 pb-6">
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Browse the collection</span>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">All Cameras</h1>
          <p className="mt-1 text-sm text-repixl-muted">
            {filtered.length} {filtered.length === 1 ? 'camera' : 'cameras'} available
          </p>
        </motion.div>

        {/* ── Mobile filter bar ── */}
        <div className="mb-5 flex items-center justify-between gap-3 lg:hidden">
          <button type="button" onClick={() => setMobileFiltersOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light/80 transition-colors hover:border-repixl-muted/40 hover:text-repixl-text-light">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="6" y2="6" /><line x1="8" x2="16" y1="12" y2="12" /><line x1="12" x2="12" y1="18" y2="18" /></svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-repixl-red text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-mobile" className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Sort</label>
            <select id="sort-mobile" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
              className="rounded border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none">
              <option value="newest">Newest</option>
              <option value="price-asc">Price ↑</option>
              <option value="price-desc">Price ↓</option>
            </select>
          </div>
        </div>

        {/* ── Mobile filter drawer ── */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: reducedMotionPref ? 0 : 0.2 }}
                className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileFiltersOpen(false)} aria-hidden="true"
              />
              <motion.div
                initial={reducedMotionPref ? {} : { x: '-100%' }}
                animate={{ x: 0 }}
                exit={reducedMotionPref ? {} : { x: '-100%' }}
                transition={{ duration: reducedMotionPref ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="fixed inset-y-0 left-0 z-[160] w-72 overflow-y-auto bg-repixl-charcoal p-6 shadow-2xl lg:hidden"
                role="dialog" aria-label="Filters"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="font-display text-base font-semibold text-repixl-text-light">Filters</p>
                  <button type="button" onClick={() => setMobileFiltersOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-repixl-muted hover:bg-repixl-bg hover:text-repixl-text-light" aria-label="Close filters">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </div>
                <FilterPanel {...filterProps} />
                <button type="button" onClick={() => setMobileFiltersOpen(false)}
                  className="mt-6 w-full rounded-xl bg-repixl-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                  Show {filtered.length} {filtered.length === 1 ? 'camera' : 'cameras'}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ── Desktop filter sidebar ── */}
          <motion.aside variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-24 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
              <FilterPanel {...filterProps} />
            </div>
          </motion.aside>

          {/* ── Product grid ── */}
          <motion.div variants={fadeUp} initial="hidden" animate="show"
            transition={{ delay: reducedMotion ? 0 : 0.15 }}
            className="flex-1">

            {/* Desktop toolbar */}
            <div className="mb-6 hidden items-center justify-between gap-3 lg:flex">
              <div className="flex flex-wrap gap-2">
                {selectedBrands.map((brand) => (
                  <button key={brand} onClick={() => toggleBrand(brand)}
                    className="inline-flex items-center gap-1 rounded-full border border-repixl-muted/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70 transition-colors hover:border-repixl-red/50 hover:text-repixl-red">
                    {brand}<span aria-hidden="true">×</span>
                  </button>
                ))}
                {selectedConditions.map((c) => (
                  <button key={c} onClick={() => toggleCondition(c)}
                    className="inline-flex items-center gap-1 rounded-full border border-repixl-muted/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70 transition-colors hover:border-repixl-red/50 hover:text-repixl-red">
                    {c}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <label htmlFor="sort-desktop" className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Sort</label>
                <select id="sort-desktop" value={sort} onChange={(e) => setSort(e.target.value as SortOption)}
                  className="rounded border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none">
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: low → high</option>
                  <option value="price-desc">Price: high → low</option>
                </select>
              </div>
            </div>

            {/* Grid / loading / empty */}
            {!hydrated ? (
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
            ) : filtered.length > 0 ? (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                key={`${selectedBrands.join()}-${selectedConditions.join()}-${priceRange.join()}-${sort}`}
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filtered.map((product) => (
                  <motion.div key={product.slug} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } } }} className="h-full">
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div variants={fadeUp} initial="hidden" animate="show"
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-repixl-muted/20 py-28 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" />
                  </svg>
                </div>
                <p className="font-display text-display-sm text-repixl-text-light/60">No cameras found</p>
                <p className="mt-1 text-sm text-repixl-muted">Try adjusting your filters or clearing them entirely.</p>
                <button type="button" onClick={clearAll}
                  className="mt-5 rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-red transition-colors hover:border-repixl-red/50 hover:bg-repixl-red/5">
                  Clear all filters
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </Container>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <>
      <Suspense fallback={
        <div className="burn-subtle min-h-screen pb-20 pt-24">
          <Container><p className="text-sm text-repixl-muted">Loading…</p></Container>
        </div>
      }>
        <ProductsContent />
      </Suspense>
      <Footer />
    </>
  )
}
