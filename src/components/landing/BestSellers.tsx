'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { SectionHeader } from '@/components/ui'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useThemeStore } from '@/stores/themeStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function BestSellers() {
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'
  const allProducts = useProductStore((s) => s.products)
  const allReviews = useReviewStore((s) => s.reviews)

  useEffect(() => {
    useProductStore.getState().hydrate()
    useReviewStore.getState().hydrate()
  }, [])

  const bestSellers = useMemo(() => {
    const active = allProducts.filter((p) => p.status === 'active' && p.stock > 0)
    return [...active]
      .sort((a, b) => {
        const reviewsA = allReviews.filter((r) => r.productSlug === a.slug).length
        const reviewsB = allReviews.filter((r) => r.productSlug === b.slug).length
        return reviewsB - reviewsA
      })
      .slice(0, 4)
  }, [allProducts, allReviews])

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reducedMotion ? 0 : 0.08 } },
  }
  const item = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  }

  if (bestSellers.length === 0) return null

  return (
    <section className="py-20 md:py-28">
      <Container>
        {/* Editorial Section Header with original typography + reference color split */}
        <SectionHeader
          eyebrow="Fan Favorites"
          title="Best Sellers"
          highlightWord="Sellers"
          className="mb-12 md:mb-16"
        />

        {/* Product Cards Grid — 4 substantial cards with equal height */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-60px' }}
          className="mx-auto grid max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {bestSellers.map((product, index) => (
            <motion.div key={product.slug} variants={item} className="h-full">
              <ProductCard product={product} variant={index} />
            </motion.div>
          ))}
        </motion.div>

        {/* View All Callout — Wide intentional pill outline: neutral default, red on hover */}
        <div className="mt-14 flex justify-center">
          <Link
            href="/products"
            className={`group inline-flex items-center gap-2.5 rounded-full border px-9 py-3 font-mono text-xs uppercase tracking-widest transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EF4444] focus-visible:ring-offset-2 ${
              isLight
                ? 'border-neutral-300 bg-white text-neutral-900 hover:border-[#B91C1C] hover:bg-[#B91C1C]/5 hover:text-[#B91C1C] hover:shadow-[0_0_16px_rgba(185,28,28,0.15)] focus-visible:border-[#B91C1C] focus-visible:text-[#B91C1C] focus-visible:ring-offset-white'
                : 'border-white/20 bg-transparent text-white hover:border-[#EF4444] hover:bg-[#B91C1C]/10 hover:text-[#EF4444] hover:shadow-[0_0_20px_rgba(239,68,68,0.25)] focus-visible:border-[#EF4444] focus-visible:text-[#EF4444] focus-visible:ring-offset-black'
            }`}
          >
            <span>VIEW ALL CAMERAS</span>
            <span className="transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true">→</span>
          </Link>
        </div>
      </Container>
    </section>
  )
}