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

function CompareContent() {
  const searchParams = useSearchParams()
  const paramSlugs = (searchParams.get('items') ?? '').split(',').filter(Boolean)
  const { fadeUp, staggerContainer, staggerItem, viewport, reducedMotion } = useRevealAnimation()

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

  const specRows: { label: string; getValue: (p: Product) => string }[] = [
    { label: 'Price', getValue: (p) => `$${p.price}` },
    { label: 'Condition', getValue: (p) => p.condition.charAt(0).toUpperCase() + p.condition.slice(1) },
    { label: 'Rating', getValue: (p) => { const avg = getAverageRating(p.slug); return avg > 0 ? `★ ${avg.toFixed(1)}` : 'No reviews' } },
    { label: 'Brand', getValue: (p) => p.brand },
    { label: 'Series', getValue: (p) => p.series },
    { label: 'Resolution', getValue: (p) => `${p.specs.megapixels} MP` },
    { label: 'Zoom', getValue: (p) => p.specs.zoom },
    { label: 'Storage', getValue: (p) => p.specs.storage },
    { label: 'Year', getValue: (p) => String(p.specs.year) },
  ]

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        {/* Page header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-10 border-b border-repixl-muted/10 pb-8"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
            — Side by side
          </span>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
            Compare Cameras
          </h1>
          <p className="mt-1 text-sm text-repixl-muted">
            Select up to {MAX_COMPARE} cameras to compare specifications side by side.
          </p>
        </motion.div>

        {/* Empty state */}
        {selectedProducts.length === 0 && !pickerOpen && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-repixl-muted/20 py-24 text-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/30" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />
            </svg>
            <p className="mt-4 font-display text-display-sm text-repixl-text-light/60">No cameras selected</p>
            <p className="mt-1 text-sm text-repixl-muted">Add cameras to start comparing specifications.</p>
            <Button variant="primary" size="md" className="mt-6" onClick={() => setPickerOpen(true)}>
              Add a Camera
            </Button>
          </motion.div>
        )}

        {/* Compare table */}
        {selectedProducts.length > 0 && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="mt-4 overflow-x-auto rounded-lg border border-repixl-muted/10"
          >
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="border-b border-repixl-muted/10">
                  {/* Label column header */}
                  <th className="sticky left-0 z-10 w-32 bg-repixl-charcoal p-4 text-left">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Spec</span>
                  </th>
                  {selectedProducts.map((product) => (
                    <th key={product.slug} className="bg-repixl-charcoal p-4 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Link href={`/products/${product.slug}`} className="group block">
                          <div className="mx-auto h-20 w-20 overflow-hidden rounded-lg border border-repixl-muted/10 bg-repixl-bg p-2 transition-colors group-hover:border-repixl-muted/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={product.image} alt={product.name} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
                          </div>
                        </Link>
                        <div>
                          <Link href={`/products/${product.slug}`} className="text-sm font-medium text-repixl-text-light transition-colors hover:text-repixl-red">
                            {product.name}
                          </Link>
                          <div className="mt-1 flex justify-center">
                            <ConditionBadge condition={product.condition} />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => storeRemove(product.slug)}
                          aria-label={`Remove ${product.name}`}
                          className="inline-flex items-center gap-1 rounded border border-repixl-muted/20 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-red/40 hover:text-repixl-red"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                  {/* Add slot */}
                  {selectedProducts.length < MAX_COMPARE && (
                    <th className="bg-repixl-charcoal p-4 text-center align-middle">
                      <button
                        type="button"
                        onClick={() => setPickerOpen(true)}
                        className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-lg border border-dashed border-repixl-muted/30 text-repixl-muted transition-colors hover:border-repixl-muted/60 hover:text-repixl-text-light"
                        aria-label="Add camera to compare"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        <span className="mt-1 font-mono text-[9px]">Add</span>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {specRows.map((row, index) => (
                  <tr key={row.label} className={`border-b border-repixl-muted/5 ${index % 2 === 0 ? '' : 'bg-repixl-charcoal/20'}`}>
                    <td className="sticky left-0 z-10 bg-repixl-charcoal p-4">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{row.label}</span>
                    </td>
                    {selectedProducts.map((product) => (
                      <td key={product.slug} className="p-4 text-center font-mono text-sm text-repixl-text-light">
                        {row.getValue(product)}
                      </td>
                    ))}
                    {selectedProducts.length < MAX_COMPARE && <td className="p-4" />}
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* Add another camera button */}
        {selectedProducts.length > 0 && selectedProducts.length < MAX_COMPARE && !pickerOpen && (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-5"
          >
            <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>
              + Add another camera
            </Button>
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
            className="mt-6 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Add a camera</span>
                <p className="mt-0.5 text-sm text-repixl-text-light/60">Search by name or brand</p>
              </div>
              <button
                type="button"
                onClick={() => { setPickerOpen(false); setSearchQuery('') }}
                className="flex h-8 w-8 items-center justify-center rounded-full text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light"
                aria-label="Close picker"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <div className="mt-3">
              <label htmlFor="compare-search" className="sr-only">Search cameras</label>
              <input
                id="compare-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cameras…"
                className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none"
              />
            </div>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {availableProducts.length === 0 && (
                <li className="py-6 text-center text-sm text-repixl-muted">No cameras match your search.</li>
              )}
              {availableProducts.map((product) => (
                <li key={product.slug}>
                  <button
                    type="button"
                    onClick={() => addCamera(product.slug)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-repixl-bg"
                  >
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
          <Container>
            <p className="text-sm text-repixl-muted">Loading…</p>
          </Container>
        </div>
      }>
        <CompareContent />
      </Suspense>
      <Footer />
    </>
  )
}
