'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useProductStore } from '@/stores/productStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { formatPrice } from '@/lib/format'

export function NewArrivals() {
  const reducedMotion = useReducedMotion()
  const allProducts = useProductStore((s) => s.products)

  useEffect(() => {
    useProductStore.getState().hydrate()
  }, [])

  const arrivals = useMemo(() => {
    const active = allProducts.filter((p) => p.status === 'active')
    return [...active].sort((a, b) => b.specs.year - a.specs.year).slice(0, 2)
  }, [allProducts])

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reducedMotion ? 0 : 0.1 } },
  }
  const item = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] } },
  }

  if (arrivals.length === 0) return null

  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="mb-10 flex items-center justify-between">
          <h2 className="font-display text-display-md text-repixl-text-light md:text-display-lg">
            New Arrivals
          </h2>
          <Link
            href="/products?sort=newest"
            className="hidden rounded-full border border-repixl-muted/25 px-5 py-2 font-mono text-[11px] uppercase tracking-wider text-repixl-text-light/80 transition-colors hover:border-repixl-red/50 hover:text-repixl-text-light md:inline-block"
          >
            View All
          </Link>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {arrivals.map((product) => (
            <motion.div key={product.slug} variants={item}>
              <Link href={`/products/${product.slug}`} className="group relative block overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal">
                {product.stock > 0 && (
                  <span className="absolute left-4 top-4 z-10 rounded-full bg-repixl-text-light px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-repixl-text-dark">
                    New
                  </span>
                )}
                <div className="aspect-[4/3] p-10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="border-t border-repixl-muted/10 p-5">
                  <h3 className="font-display text-lg font-semibold text-repixl-text-light">{product.name}</h3>
                  <p className="mt-1 font-display text-base font-bold text-repixl-text-light/80">{formatPrice(product.price)}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
