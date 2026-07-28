'use client'

import { useRef } from 'react'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'

export function FeaturedCarousel() {
  const allProducts = useProductStore((s) => s.products)
  const featured = allProducts.filter((p) => p.status === 'active').slice(0, 6)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return
    const cardWidth = scrollRef.current.querySelector('div')?.offsetWidth ?? 300
    const gap = 16
    const distance = cardWidth + gap
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth',
    })
  }

  return (
    <section className="bg-repixl-bg pb-24 pt-12 md:pb-36 md:pt-16">
      <Container>
        {/* Header row */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — New arrivals
            </span>
            <h2 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
              Featured cameras
            </h2>
          </div>

          {/* Arrow controls */}
          <div className="hidden items-center gap-2 md:flex">
            <button
              type="button"
              onClick={() => scroll('left')}
              aria-label="Scroll left"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-repixl-muted/20 text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => scroll('right')}
              aria-label="Scroll right"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-repixl-muted/20 text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </Container>

      {/* Carousel — bleeds to edge, scroll-snap, padded to Container alignment */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-6 pb-4 md:px-10 lg:px-[max(4rem,calc((100vw-1440px)/2+4rem))]"
        style={{ scrollbarWidth: 'none' }}
      >
        {featured.map((product) => (
          <div
            key={product.slug}
            className="w-[280px] flex-shrink-0 snap-start md:w-[300px]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
