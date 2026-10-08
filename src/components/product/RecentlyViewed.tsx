'use client'

import { useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ProductCard } from '@/components/product/ProductCard'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { useProductStore } from '@/stores/productStore'
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore'

export function RecentlyViewed({ compact = false }: { compact?: boolean }) {
  const products = useProductStore((state) => state.products)
  const slugs = useRecentlyViewedStore((state) => state.slugs)
  const hydrate = useRecentlyViewedStore((state) => state.hydrate)
  const { staggerContainer, staggerItem, viewport } = useRevealAnimation()

  useEffect(() => { hydrate() }, [hydrate])

  const recentlyViewed = useMemo(
    () => slugs.map((slug) => products.find((product) => product.slug === slug)).filter(Boolean).slice(0, 4),
    [products, slugs]
  )

  if (recentlyViewed.length === 0) return null

  const content = <motion.div variants={staggerContainer} initial="hidden" whileInView="show" viewport={viewport} className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-5">{recentlyViewed.map((product) => product && <motion.div key={product.slug} variants={staggerItem}><ProductCard product={product} compact /></motion.div>)}</motion.div>

  if (compact) return <section aria-labelledby="recently-viewed-heading" className="mt-16 border-t border-repixl-muted/10 pt-10"><h2 id="recently-viewed-heading" className="font-display text-display-sm text-repixl-text-light">Continue browsing</h2><div className="mt-6">{content}</div></section>

  return <section aria-labelledby="recently-viewed-heading" className="py-16 md:py-20"><Container><div className="mb-8"><span className="font-mono text-[10px] uppercase tracking-[0.22em] text-repixl-muted">Your archive trail</span><h2 id="recently-viewed-heading" className="mt-2 font-display text-display-sm text-repixl-text-light md:text-display-md">Continue browsing</h2></div>{content}</Container></section>
}
