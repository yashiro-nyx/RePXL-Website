'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ConditionBadge, RevealText } from '@/components/ui'
import { useProductStore } from '@/stores/productStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatPrice } from '@/lib/format'

export function BestSellers() {
  const reducedMotion = useReducedMotion()
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
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  if (bestSellers.length === 0) return null

  return (
    <section className="py-16 md:py-20">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mb-10 flex flex-col items-center gap-3 text-center"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
            — Fan favorites
          </span>
          <RevealText
            as="h2"
            text="Best Sellers"
            className="font-display text-display-md text-repixl-text-light md:text-display-lg"
          />
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: false, margin: '-60px' }}
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
        >
          {bestSellers.map((product) => {
            const reviewCount = allReviews.filter((r) => r.productSlug === product.slug).length
            return (
              <motion.div key={product.slug} variants={item}>
                <Link href={`/products/${product.slug}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3">
                      <ConditionBadge condition={product.condition} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted">{product.brand}</p>
                    <h3 className="mt-0.5 text-sm font-medium text-repixl-text-light line-clamp-1">{product.name}</h3>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-display text-base font-bold text-repixl-text-light">{formatPrice(product.price)}</span>
                      {reviewCount > 0 && (
                        <span className="font-mono text-[9px] text-repixl-muted">{reviewCount} review{reviewCount !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>

        <div className="mt-8 flex justify-center">
          <Link
            href="/products"
            className="rounded-full border border-repixl-muted/25 px-6 py-2.5 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/80 transition-colors hover:border-repixl-red/50 hover:text-repixl-text-light"
          >
            View All
          </Link>
        </div>
      </Container>
    </section>
  )
}