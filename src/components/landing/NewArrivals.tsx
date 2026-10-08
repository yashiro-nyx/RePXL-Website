'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { useProductStore } from '@/stores/productStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { withHomeContext } from '@/lib/back-navigation'

export function NewArrivals() {
  const { staggerContainer, staggerItem, viewport } = useRevealAnimation()
  const allProducts = useProductStore((s) => s.products)

  useEffect(() => {
    useProductStore.getState().hydrate()
  }, [])

  const arrivals = useMemo(() => {
    const active = allProducts.filter((p) => p.status === 'active')
    return [...active].sort((a, b) => b.specs.year - a.specs.year).slice(0, 4)
  }, [allProducts])

  if (arrivals.length === 0) return null

  return (
    <section className="py-14 md:py-20">
      <Container>
        <div className="mb-8 flex items-end justify-between gap-4 md:mb-10">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-repixl-muted">Fresh from the archive</span>
            <h2 className="mt-2 font-display text-display-sm text-repixl-text-light md:text-display-md">New Arrivals</h2>
          </div>
          <Link
            href={withHomeContext('/products?sort=newest')}
            className="rounded-full border border-repixl-muted/25 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/80 transition-colors hover:border-repixl-red/50 hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 md:px-5 md:text-[11px]"
          >
            View All
          </Link>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4"
        >
          {arrivals.map((product) => (
            <motion.div key={product.slug} variants={staggerItem} className="relative">
              {product.stock > 0 && <span className="pointer-events-none absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-repixl-text-light/20 bg-repixl-bg/80 px-2.5 py-1 font-mono text-[9px] uppercase tracking-wider text-repixl-text-light backdrop-blur-sm">New</span>}
              <ProductCard product={product} compact />
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
