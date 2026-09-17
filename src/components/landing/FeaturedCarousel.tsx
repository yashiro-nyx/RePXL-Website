'use client'

import { formatPrice } from '@/lib/format'
import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { SectionHeader } from '@/components/ui'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function FeaturedCarousel() {
  const allProducts = useProductStore((s) => s.products)
  const featured = useMemo(() => allProducts.filter((p) => p.status === 'active' && p.stock > 0), [allProducts])
  const [centerIndex, setCenterIndex] = useState(0)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    useProductStore.getState().hydrate()
    useReviewStore.getState().hydrate()
  }, [])

  const canPrev = centerIndex > 0
  const canNext = centerIndex < featured.length - 1

  const goNext = () => { if (canNext) setCenterIndex((i) => i + 1) }
  const goPrev = () => { if (canPrev) setCenterIndex((i) => i - 1) }

  // Get visible items: left, center, right
  const leftItem = centerIndex > 0 ? featured[centerIndex - 1] : null
  const centerItem = featured[centerIndex]
  const rightItem = centerIndex < featured.length - 1 ? featured[centerIndex + 1] : null

  if (!centerItem) return null

  return (
    <section className="pb-24 pt-12 md:pb-36 md:pt-16">
      <Container>
        {/* Header */}
        <SectionHeader
          eyebrow="New Arrivals"
          title="Featured Cameras"
          highlightWord="Cameras"
          className="mb-12"
        />
      </Container>

      {/* Carousel */}
      <div className="relative mx-auto max-w-6xl px-4">
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {/* Left arrow — square, viewfinder-style */}
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="Previous cameras"
            className="hidden h-11 w-11 flex-shrink-0 items-center justify-center border border-repixl-muted/30 text-repixl-text-light/70 transition-all hover:border-repixl-muted/60 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:border-repixl-muted/30 md:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>

          {/* Side item — left (desktop only) */}
          <div className="hidden w-[200px] flex-shrink-0 md:block">
            {leftItem ? (
              <button
                type="button"
                onClick={goPrev}
                className="block w-full text-left opacity-50 transition-all duration-300 hover:opacity-70"
                style={{ transform: 'scale(0.9)' }}
              >
                <SideCard product={leftItem} />
              </button>
            ) : (
              <div className="h-[280px]" />
            )}
          </div>

          {/* Center card — featured */}
          <div className="w-full max-w-sm flex-shrink-0 md:max-w-md">
            <AnimatePresence mode="wait">
              <motion.div
                key={centerItem.slug}
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
                transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
              >
                <ProductCard product={centerItem} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Side item — right (desktop only) */}
          <div className="hidden w-[200px] flex-shrink-0 md:block">
            {rightItem ? (
              <button
                type="button"
                onClick={goNext}
                className="block w-full text-left opacity-50 transition-all duration-300 hover:opacity-70"
                style={{ transform: 'scale(0.9)' }}
              >
                <SideCard product={rightItem} />
              </button>
            ) : (
              <div className="h-[280px]" />
            )}
          </div>

          {/* Right arrow — square, viewfinder-style */}
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            aria-label="Next cameras"
            className="hidden h-11 w-11 flex-shrink-0 items-center justify-center border border-repixl-muted/30 text-repixl-text-light/70 transition-all hover:border-repixl-muted/60 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:opacity-20 disabled:hover:border-repixl-muted/30 md:flex"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>

        {/* Mobile arrows — below the card */}
        <div className="mt-6 flex items-center justify-center gap-4 md:hidden">
          <button
            type="button"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="Previous cameras"
            className="flex h-10 w-10 items-center justify-center border border-repixl-muted/30 text-repixl-text-light/70 transition-all hover:border-repixl-muted/60 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:opacity-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <span className="font-mono text-[10px] tracking-wider text-repixl-muted">
            {centerIndex + 1} / {featured.length}
          </span>
          <button
            type="button"
            onClick={goNext}
            disabled={!canNext}
            aria-label="Next cameras"
            className="flex h-10 w-10 items-center justify-center border border-repixl-muted/30 text-repixl-text-light/70 transition-all hover:border-repixl-muted/60 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:opacity-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </div>

        {/* Dot indicators (desktop) */}
        {featured.length > 1 && (
          <div className="mt-8 hidden items-center justify-center gap-1.5 md:flex">
            {featured.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCenterIndex(i)}
                aria-label={`Go to camera ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === centerIndex ? 'w-6 bg-repixl-red' : 'w-1.5 bg-repixl-muted/30 hover:bg-repixl-muted/60'}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}



/* Side card — compact, reduced opacity applied by parent */
function SideCard({ product }: { product: any }) {
  const allReviews = useReviewStore((s) => s.reviews)
  const reviews = allReviews.filter((r) => r.productSlug === product.slug)
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0

  return (
    <div className="overflow-hidden rounded-lg border border-repixl-muted/10 bg-repixl-charcoal">
      <div className="aspect-square bg-repixl-bg p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
      </div>
      <div className="p-3">
        <p className="font-mono text-[8px] uppercase tracking-widest text-repixl-muted">{product.brand}</p>
        <h4 className="mt-0.5 text-xs font-medium text-repixl-text-light/80 line-clamp-1">{product.name}</h4>
        {reviews.length > 0 && (
          <div className="mt-1 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-repixl-warning"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            <span className="font-mono text-[8px] text-repixl-muted">{avgRating.toFixed(1)}</span>
          </div>
        )}
        <p className="mt-1.5 font-display text-sm font-bold text-repixl-text-light">{formatPrice(product.price)}</p>
      </div>
    </div>
  )
}
