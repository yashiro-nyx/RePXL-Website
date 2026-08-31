'use client'

import { Suspense, useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { ConditionBadge, Skeleton } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useProductStore } from '@/stores/productStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { ConditionGrade } from '@/types'

const conditions: ConditionGrade[] = ['mint', 'excellent', 'good', 'fair']

type SortOption = 'price-asc' | 'price-desc' | 'newest'

function ProductsContent() {
  const searchParams = useSearchParams()
  const reducedMotion = useReducedMotion()
  const allProducts = useProductStore((s) => s.products)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    useProductStore.getState().hydrate()
    setHydrated(true)
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

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    )
  }
  const toggleCondition = (condition: ConditionGrade) => {
    setSelectedConditions((prev) =>
      prev.includes(condition) ? prev.filter((c) => c !== condition) : [...prev, condition]
    )
  }

  const filtered = useMemo(() => {
    let result = products.filter((p) => {
      if (selectedBrands.length > 0 && !selectedBrands.includes(p.brand)) return false
      if (selectedConditions.length > 0 && !selectedConditions.includes(p.condition)) return false
          if (p.price < priceRange[0] || p.price > priceRange[1]) return false
      return true
    })

    switch (sort) {
      case 'price-asc':
        result = [...result].sort((a, b) => a.price - b.price)
        break
      case 'price-desc':
        result = [...result].sort((a, b) => b.price - a.price)
        break
      case 'newest':
        result = [...result].sort((a, b) => b.specs.year - a.specs.year)
        break
    }

    return result
  }, [selectedBrands, selectedConditions, priceRange, sort, products])

  const hasFilters = selectedBrands.length > 0 || selectedConditions.length > 0 || priceRange[0] > 0 || priceRange[1] < 300

  const clearAll = () => {
    setSelectedBrands([])
    setSelectedConditions([])
    setPriceRange([0, 300])
  }

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Container>
        <div className="mb-8">
          <h1 className="font-display text-display-md text-repixl-text-light md:text-display-lg">
            All Cameras
          </h1>
          <p className="mt-1 text-sm text-repixl-muted">
            {filtered.length} {filtered.length === 1 ? 'camera' : 'cameras'} available
          </p>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-56">
            <div className="sticky top-24 space-y-6">
              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Brand</h3>
                <ul className="mt-3 space-y-2">
                  {brands.map((brand) => (
                    <li key={brand}>
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-repixl-text-light/80 hover:text-repixl-text-light">
                        <input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleBrand(brand)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red focus:ring-repixl-red/30" />
                        {brand}
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Condition</h3>
                <ul className="mt-3 space-y-2">
                  {conditions.map((condition) => (
                    <li key={condition}>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input type="checkbox" checked={selectedConditions.includes(condition)} onChange={() => toggleCondition(condition)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red focus:ring-repixl-red/30" />
                        <ConditionBadge condition={condition} />
                      </label>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Price range</h3>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={priceRange[1]} value={priceRange[0]} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} aria-label="Minimum price" className="w-full rounded border border-repixl-muted/20 bg-repixl-charcoal px-2 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none" />
                    <span className="text-xs text-repixl-muted">—</span>
                    <input type="number" min={priceRange[0]} max={999} value={priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])} aria-label="Maximum price" className="w-full rounded border border-repixl-muted/20 bg-repixl-charcoal px-2 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none" />
                  </div>
                </div>
              </div>

              {hasFilters && (
                <button type="button" onClick={clearAll} className="text-xs text-repixl-red hover:underline">
                  Clear all filters
                </button>
              )}
            </div>
          </aside>

          <div className="flex-1">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {selectedBrands.map((brand) => (
                  <button key={brand} onClick={() => toggleBrand(brand)} className="inline-flex items-center gap-1 rounded-full border border-repixl-muted/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70 hover:border-repixl-red/50 hover:text-repixl-red">
                    {brand}<span aria-hidden="true">×</span>
                  </button>
                ))}
                {selectedConditions.map((c) => (
                  <button key={c} onClick={() => toggleCondition(c)} className="inline-flex items-center gap-1 rounded-full border border-repixl-muted/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/70 hover:border-repixl-red/50 hover:text-repixl-red">
                    {c}<span aria-hidden="true">×</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-xs text-repixl-muted">Sort:</label>
                <select id="sort-select" value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="rounded border border-repixl-muted/20 bg-repixl-charcoal px-3 py-1.5 font-mono text-xs text-repixl-text-light focus:border-repixl-muted/50 focus:outline-none">
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: low → high</option>
                  <option value="price-desc">Price: high → low</option>
                </select>
              </div>
            </div>

            {!hydrated ? (
              /* Skeleton grid — 6 card placeholders while store hydrates */
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-repixl-muted/10 bg-repixl-charcoal">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="p-4 space-y-2">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/4" />
                      <div className="flex items-center justify-between pt-1">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-6 w-16 rounded-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length > 0 ? (
              <motion.div
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.4 }}
                key={`${selectedBrands.join()}-${selectedConditions.join()}-${priceRange.join()}-${sort}`}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
              >
                {filtered.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-repixl-muted/20 py-24 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" /></svg>
                <p className="mt-4 font-display text-display-sm text-repixl-text-light/60">No cameras found</p>
                <p className="mt-1 text-sm text-repixl-muted">Try adjusting your filters or clearing them entirely.</p>
                <button type="button" onClick={clearAll} className="mt-4 text-sm text-repixl-red hover:underline">Clear all filters</button>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}

export default function ProductsPage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen pt-24 pb-16"><Container><p className="text-sm text-repixl-muted">Loading...</p></Container></div>}>
        <ProductsContent />
      </Suspense>
      <Footer />
    </>
  )
}
