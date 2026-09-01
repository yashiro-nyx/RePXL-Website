'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ConditionBadge, RevealText } from '@/components/ui'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
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
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mb-12 text-center"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
            — New arrivals
          </span>
          <RevealText
            as="h2"
            text="Featured cameras"
            className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg"
          />
        </motion.div>
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
                <CenterCard product={centerItem} />
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

/* Center card — enlarged, full detail, add-to-cart */
function CenterCard({ product }: { product: any }) {
  const allReviews = useReviewStore((s) => s.reviews)
  const reviews = allReviews.filter((r) => r.productSlug === product.slug)
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0
  const addToCart = useCartStore((s) => s.addToCart)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const addToast = useToastStore((s) => s.addToast)

  const handleAddToCart = () => {
    if (!isLoggedIn) { addToast('Please log in to add items to cart', 'info'); return }
    addToCart(product.slug, 1)
    addToast(`${product.name} added to cart`, 'success', { label: 'View Cart', href: '/cart' }, 5000, product.image)
  }

  return (
    <div className="overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal shadow-2xl">
      {/* Image area with sample photo accent */}
      <div className="relative aspect-square bg-repixl-bg p-8">
        <Link href={`/products/${product.slug}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
        </Link>
        {/* Condition badge — top right */}
        <div className="absolute right-4 top-4">
          <ConditionBadge condition={product.condition} />
        </div>
        {/* Small polaroid accent — bottom left */}
        <div className="absolute bottom-3 left-3 rounded-sm bg-white p-1 shadow-lg" style={{ transform: 'rotate(-3deg)' }}>
          <div className="h-10 w-10 bg-repixl-muted/20" />
          <p className="mt-0.5 text-center font-mono text-[6px] text-repixl-text-dark/40">sample</p>
        </div>
      </div>

      {/* Info */}
      <div className="p-5">
        <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">{product.brand} · {product.series}</p>
        <Link href={`/products/${product.slug}`}>
          <h3 className="mt-1 font-display text-lg font-semibold text-repixl-text-light hover:underline">{product.name}</h3>
        </Link>

        {/* Rating */}
        {reviews.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {Array.from({ length: 5 }, (_, i) => (
                <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={i < Math.round(avgRating) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < Math.round(avgRating) ? 'text-repixl-warning' : 'text-repixl-muted/30'}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
            </div>
            <span className="font-mono text-[9px] text-repixl-muted">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Price + stock */}
        <div className="mt-3 flex items-center justify-between">
          <span className="font-display text-xl font-bold text-repixl-text-light">${product.price}</span>
          <span className="font-mono text-[9px] text-repixl-success">{product.stock} in stock</span>
        </div>

        {/* Add to Cart */}
        <button
          type="button"
          onClick={handleAddToCart}
          className="mt-4 w-full rounded bg-repixl-red py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
        >
          Add to Cart
        </button>
      </div>
    </div>
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
        <p className="mt-1.5 font-display text-sm font-bold text-repixl-text-light">${product.price}</p>
      </div>
    </div>
  )
}