'use client'

import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useCompareStore } from '@/stores/compareStore'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import type { Product } from '@/types'

const MAX_COMPARE = 3

// ─── Spec section grouping ───────────────────────────────────────────────────
interface SpecSection {
  label: string
  rows: { key: string; label: string; getValue: (p: Product) => string; highlight?: boolean }[]
}

function buildSections(getAverageRating: (slug: string) => number): SpecSection[] {
  return [
    {
      label: 'Pricing & Availability',
      rows: [
        { key: 'price', label: 'Price', getValue: (p) => `$${p.price}`, highlight: true },
        { key: 'stock', label: 'Stock', getValue: (p) => Math.max(0, p.stock) > 0 ? `${Math.max(0, p.stock)} available` : 'Out of stock', highlight: true },
        { key: 'condition', label: 'Condition', getValue: (p) => p.condition.charAt(0).toUpperCase() + p.condition.slice(1), highlight: true },
      ],
    },
    {
      label: 'Ratings & Reviews',
      rows: [
        { key: 'rating', label: 'Rating', getValue: (p) => { const avg = getAverageRating(p.slug); return avg > 0 ? `★ ${avg.toFixed(1)} / 5` : 'No reviews yet' } },
      ],
    },
    {
      label: 'Camera Specifications',
      rows: [
        { key: 'brand', label: 'Brand', getValue: (p) => p.brand },
        { key: 'series', label: 'Series', getValue: (p) => p.series },
        { key: 'resolution', label: 'Resolution', getValue: (p) => `${p.specs.megapixels} MP`, highlight: true },
        { key: 'zoom', label: 'Optical Zoom', getValue: (p) => p.specs.zoom, highlight: true },
        { key: 'storage', label: 'Storage', getValue: (p) => p.specs.storage },
        { key: 'year', label: 'Year', getValue: (p) => String(p.specs.year) },
      ],
    },
  ]
}

// ─── Column width helper — equal columns for 1, 2, or 3 cameras ─────────────
const colWidths = ['', 'sm:w-1/2', 'sm:w-1/3']

function CompareContent() {
  const searchParams = useSearchParams()
  const paramSlugs = (searchParams.get('items') ?? '').split(',').filter(Boolean)
  const { fadeUp, viewport, reducedMotion } = useRevealAnimation()

  const storeSlugs = useCompareStore((s) => s.slugs)
  const storeAdd = useCompareStore((s) => s.addToCompare)
  const storeRemove = useCompareStore((s) => s.removeFromCompare)

  useEffect(() => {
    useCompareStore.getState().hydrate()
    useProductStore.getState().hydrate()
    useReviewStore.getState().hydrate()
    const current = useCompareStore.getState().slugs
    if (current.length === 0 && paramSlugs.length > 0) {
      paramSlugs.forEach((slug) => {
        if (useProductStore.getState().products.some((p) => p.slug === slug)) {
          useCompareStore.getState().addToCompare(slug)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [searchQuery, setSearchQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    const el = pickerRef.current
    if (!el) return
    el.querySelector('input')?.focus()
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setPickerOpen(false); setSearchQuery('') }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [pickerOpen])

  const allProducts = useProductStore((s) => s.products)
  const activeProducts = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts])

  const selectedProducts = useMemo(
    () => storeSlugs.map((slug) => activeProducts.find((p) => p.slug === slug)!).filter(Boolean),
    [storeSlugs, activeProducts]
  )

  const availableProducts = useMemo(
    () =>
      activeProducts
        .filter((p) => !storeSlugs.includes(p.slug))
        .filter(
          (p) =>
            !searchQuery.trim() ||
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.brand.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    [storeSlugs, searchQuery, activeProducts]
  )

  const addCamera = (slug: string) => {
    if (storeSlugs.length >= MAX_COMPARE) return
    storeAdd(slug)
    setSearchQuery('')
    setPickerOpen(false)
  }

  const getAverageRating = useReviewStore((s) => s.getAverageRating)
  const sections = useMemo(() => buildSections(getAverageRating), [getAverageRating])

  const totalCols = selectedProducts.length + (selectedProducts.length < MAX_COMPARE ? 1 : 0)

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        {/* Page header */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-10 border-b border-repixl-muted/10 pb-8">
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Side by side</span>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">Compare Cameras</h1>
          <p className="mt-1 text-sm text-repixl-muted">Select up to {MAX_COMPARE} cameras to compare specifications side by side.</p>
        </motion.div>

        {/* Empty state */}
        {selectedProducts.length === 0 && !pickerOpen && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-28 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal/50">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/50" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />
              </svg>
            </div>
            <p className="mt-5 font-display text-display-sm text-repixl-text-light/60">No cameras selected</p>
            <p className="mt-1.5 text-sm text-repixl-muted">Add cameras to start comparing specifications.</p>
            <Button variant="primary" size="md" className="mt-6" onClick={() => setPickerOpen(true)}>Add a Camera</Button>
          </motion.div>
        )}

        {/* ── Compare layout ── */}
        {selectedProducts.length > 0 && (
          <motion.div variants={fadeUp} initial="hidden" animate="show" transition={{ delay: reducedMotion ? 0 : 0.1 }}>
            {/* ── Camera header cards ── */}
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Camera cards row */}
                <div className={`grid gap-3 ${totalCols === 2 ? 'grid-cols-[160px_1fr_1fr]' : totalCols === 3 ? 'grid-cols-[160px_1fr_1fr_1fr]' : 'grid-cols-[160px_1fr_1fr]'} mb-6`}>
                  {/* Empty label cell */}
                  <div />

                  {/* Selected camera cards */}
                  {selectedProducts.map((product) => (
                    <div key={product.slug} className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-4 text-center">
                      <Link href={`/products/${product.slug}`} className="group block">
                        <div className="mx-auto h-28 w-28 overflow-hidden rounded-xl border border-repixl-muted/10 bg-repixl-bg p-2 transition-all duration-300 group-hover:border-repixl-muted/30 group-hover:shadow-lg">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                        </div>
                      </Link>
                      <div className="mt-3 space-y-1">
                        <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{product.brand}</p>
                        <Link href={`/products/${product.slug}`} className="block font-display text-sm font-semibold text-repixl-text-light transition-colors hover:text-repixl-red line-clamp-2">{product.name}</Link>
                        <div className="flex justify-center pt-0.5"><ConditionBadge condition={product.condition} /></div>
                        <p className="font-display text-xl font-bold text-repixl-text-light">${product.price}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => storeRemove(product.slug)}
                        aria-label={`Remove ${product.name}`}
                        className="mt-3 inline-flex items-center gap-1 rounded-lg border border-repixl-muted/20 px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-red/40 hover:text-repixl-red"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        Remove
                      </button>
                    </div>
                  ))}

                  {/* Add slot */}
                  {selectedProducts.length < MAX_COMPARE && (
                    <button
                      type="button"
                      onClick={() => setPickerOpen(true)}
                      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-repixl-muted/25 p-4 text-repixl-muted transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light"
                      aria-label="Add camera to compare"
                    >
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-repixl-muted/30">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                      </div>
                      <span className="mt-2 font-mono text-[9px] uppercase tracking-wider">Add Camera</span>
                    </button>
                  )}
                </div>

                {/* ── Spec sections ── */}
                <div className="space-y-4">
                  {sections.map((section) => (
                    <div key={section.label} className="overflow-hidden rounded-xl border border-repixl-muted/10">
                      {/* Section header */}
                      <div className="border-b border-repixl-muted/10 bg-repixl-charcoal/60 px-4 py-2.5">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted/70">{section.label}</p>
                      </div>

                      {/* Spec rows */}
                      {section.rows.map((row, rowIdx) => {
                        const values = selectedProducts.map((p) => row.getValue(p))
                        const allSame = values.length > 1 && values.every((v) => v === values[0])

                        return (
                          <div
                            key={row.key}
                            className={`grid gap-0 ${
                              totalCols === 2 ? 'grid-cols-[160px_1fr_1fr]' : totalCols === 3 ? 'grid-cols-[160px_1fr_1fr_1fr]' : 'grid-cols-[160px_1fr_1fr]'
                            } ${rowIdx % 2 === 1 ? 'bg-repixl-charcoal/20' : ''}`}
                          >
                            {/* Row label */}
                            <div className="flex items-center border-r border-repixl-muted/8 px-4 py-3.5">
                              <span className={`font-mono text-[10px] uppercase tracking-wider ${row.highlight ? 'text-repixl-text-light/70' : 'text-repixl-muted'}`}>
                                {row.label}
                              </span>
                            </div>

                            {/* Row values */}
                            {selectedProducts.map((product, pi) => {
                              const val = row.getValue(product)
                              const isOutOfStock = row.key === 'stock' && val === 'Out of stock'
                              const isDifferent = !allSame && values.length > 1

                              return (
                                <div
                                  key={product.slug}
                                  className={`flex items-center justify-center px-4 py-3.5 text-center ${pi < selectedProducts.length - 1 ? 'border-r border-repixl-muted/8' : ''} ${isDifferent ? 'bg-repixl-warning/[0.03]' : ''}`}
                                >
                                  <span className={`font-mono text-sm ${
                                    isOutOfStock ? 'text-repixl-red/70' :
                                    row.highlight ? 'font-semibold text-repixl-text-light' :
                                    'text-repixl-text-light/75'
                                  }`}>
                                    {val}
                                  </span>
                                </div>
                              )
                            })}

                            {/* Placeholder for add slot column */}
                            {selectedProducts.length < MAX_COMPARE && (
                              <div className="border-l border-repixl-muted/8 px-4 py-3.5" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>

                {/* Add another camera */}
                {selectedProducts.length > 0 && selectedProducts.length < MAX_COMPARE && !pickerOpen && (
                  <div className="mt-5">
                    <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
                      + Add another camera
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Camera picker */}
        {pickerOpen && (
          <motion.div
            ref={pickerRef}
            role="dialog"
            aria-label="Add a camera to compare"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Add a camera</span>
                <p className="mt-0.5 text-sm text-repixl-text-light/60">Search by name or brand</p>
              </div>
              <button type="button" onClick={() => { setPickerOpen(false); setSearchQuery('') }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light" aria-label="Close picker">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="mt-3">
              <label htmlFor="compare-search" className="sr-only">Search cameras</label>
              <input id="compare-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras…"
                className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/40 focus:outline-none" />
            </div>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {availableProducts.length === 0 && (
                <li className="py-6 text-center text-sm text-repixl-muted">No cameras match your search.</li>
              )}
              {availableProducts.map((product) => (
                <li key={product.slug}>
                  <button type="button" onClick={() => addCamera(product.slug)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-repixl-bg/60">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-repixl-bg p-1">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-repixl-text-light">{product.name}</p>
                      <p className="font-mono text-[10px] text-repixl-muted">{product.brand} · ${product.price}</p>
                    </div>
                    <ConditionBadge condition={product.condition} />
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </Container>
    </div>
  )
}

export default function ComparePage() {
  return (
    <>
      <Suspense fallback={
        <div className="burn-subtle min-h-screen pb-20 pt-24">
          <Container><p className="text-sm text-repixl-muted">Loading…</p></Container>
        </div>
      }>
        <CompareContent />
      </Suspense>
      <Footer />
    </>
  )
}
