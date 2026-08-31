'use client'

import { Suspense, useState, useMemo, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useCompareStore } from '@/stores/compareStore'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import type { Product } from '@/types'

const MAX_COMPARE = 3

function CompareContent() {
  const searchParams = useSearchParams()
  const paramSlugs = (searchParams.get('items') ?? '').split(',').filter(Boolean)

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
    const searchInput = el.querySelector('input')
    searchInput?.focus()
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

  const removeCamera = (slug: string) => { storeRemove(slug) }

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
    <div className="min-h-screen pb-16 pt-24">
      <Container>
        <h1 className="font-display text-display-md text-repixl-text-light md:text-display-lg">
          Compare Cameras
        </h1>
        <p className="mt-1 text-sm text-repixl-muted">
          Select up to {MAX_COMPARE} cameras to compare side by side.
        </p>

        {selectedProducts.length === 0 && !pickerOpen && (
          <div className="mt-16 flex flex-col items-center text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
            <p className="mt-4 font-display text-display-sm text-repixl-text-light/60">No cameras selected</p>
            <p className="mt-1 text-sm text-repixl-muted">Add cameras below to start comparing specs.</p>
            <Button variant="primary" size="md" className="mt-6" onClick={() => setPickerOpen(true)}>Add a Camera</Button>
          </div>
        )}

        {selectedProducts.length > 0 && (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 w-36 border-b border-repixl-muted/10 bg-repixl-charcoal p-3 text-left font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Camera</th>
                  {selectedProducts.map((product) => (
                    <th key={product.slug} className="border-b border-repixl-muted/10 p-3 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Link href={`/products/${product.slug}`} className="block h-20 w-20 overflow-hidden rounded bg-repixl-charcoal p-2">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                        </Link>
                        <Link href={`/products/${product.slug}`} className="text-xs font-medium text-repixl-text-light hover:underline">{product.name}</Link>
                        <ConditionBadge condition={product.condition} />
                        <button type="button" onClick={() => removeCamera(product.slug)} aria-label={`Remove ${product.name}`} className="mt-2 inline-flex items-center gap-1 rounded border border-repixl-muted/20 px-2 py-1 text-xs text-repixl-text-light/70 transition-colors hover:border-repixl-red/50 hover:text-repixl-red">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                          Remove
                        </button>
                      </div>
                    </th>
                  ))}
                  {selectedProducts.length < MAX_COMPARE && (
                    <th className="border-b border-repixl-muted/10 p-3 text-center align-middle">
                      <button type="button" onClick={() => setPickerOpen(true)} className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded border border-dashed border-repixl-muted/30 text-repixl-muted transition-colors hover:border-repixl-muted/60 hover:text-repixl-text-light">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        <span className="mt-1 text-[9px]">Add</span>
                      </button>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {specRows.map((row, index) => (
                  <tr key={row.label} className={index % 2 === 0 ? 'bg-repixl-charcoal/30' : ''}>
                    <td className="sticky left-0 z-10 border-b border-repixl-muted/5 bg-repixl-charcoal p-3 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{row.label}</td>
                    {selectedProducts.map((product) => (
                      <td key={product.slug} className="border-b border-repixl-muted/5 p-3 text-center font-mono text-sm text-repixl-text-light">{row.getValue(product)}</td>
                    ))}
                    {selectedProducts.length < MAX_COMPARE && <td className="border-b border-repixl-muted/5 p-3" />}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pickerOpen && (
          <div ref={pickerRef} role="dialog" aria-label="Add a camera to compare" className="mt-8 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Add a camera to compare</h2>
              <button type="button" onClick={() => { setPickerOpen(false); setSearchQuery('') }} className="text-xs text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
            <div className="mt-3">
              <label htmlFor="compare-search" className="sr-only">Search cameras</label>
              <input id="compare-search" type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name or brand..." className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none" />
            </div>
            <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
              {availableProducts.length === 0 && <li className="py-4 text-center text-sm text-repixl-muted">No cameras match your search.</li>}
              {availableProducts.map((product) => (
                <li key={product.slug}>
                  <button type="button" onClick={() => addCamera(product.slug)} className="flex w-full items-center gap-3 rounded px-3 py-2 text-left transition-colors hover:bg-repixl-bg">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-repixl-bg">
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
          </div>
        )}

        {selectedProducts.length > 0 && selectedProducts.length < MAX_COMPARE && !pickerOpen && (
          <div className="mt-6">
            <Button variant="secondary" size="sm" onClick={() => setPickerOpen(true)}>+ Add another camera</Button>
          </div>
        )}
      </Container>
    </div>
  )
}

export default function ComparePage() {
  return (
    <>
      <Suspense fallback={<div className="min-h-screen pb-16 pt-24"><Container><p className="text-sm text-repixl-muted">Loading...</p></Container></div>}>
        <CompareContent />
      </Suspense>
      <Footer />
    </>
  )
}
