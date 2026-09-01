'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui'
import { ProductCard } from '@/components/product/ProductCard'
import { Footer } from '@/components/layout/Footer'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'

export default function WishlistPage() {
  const wishlistSlugs = useWishlistStore((s) => s.slugs)
  const allProducts = useProductStore((s) => s.products)
  const { fadeUp, staggerContainer, staggerItem, viewport, reducedMotion } = useRevealAnimation()

  useEffect(() => {
    useWishlistStore.getState().hydrate()
    useProductStore.getState().hydrate()
    useCartStore.getState().hydrate()
    useAuthStore.getState().hydrate()
  }, [])

  const items = wishlistSlugs
    .map((slug) => allProducts.find((p) => p.slug === slug))
    .filter(Boolean) as typeof allProducts

  // ── Empty state ──
  if (items.length === 0) {
    return (
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-repixl-muted/10 bg-repixl-charcoal">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/50" aria-hidden="true">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </div>
            <h1 className="mt-6 font-display text-display-md text-repixl-text-light">Nothing saved yet</h1>
            <p className="mt-2 text-sm text-repixl-muted">
              Browse cameras and tap the heart to save them here.
            </p>
            <Link href="/products" className="mt-6">
              <Button variant="primary" size="lg">Browse Cameras</Button>
            </Link>
          </motion.div>
        </Container>
      </div>
    )
  }

  return (
    <>
      <div className="burn-subtle min-h-screen pb-20 pt-24">
        <Container>
          {/* Header */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mb-10 border-b border-repixl-muted/10 pb-8"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Saved cameras
            </span>
            <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
              My Wishlist
            </h1>
            <p className="mt-1 text-sm text-repixl-muted">
              {items.length} {items.length === 1 ? 'camera' : 'cameras'} saved
            </p>
          </motion.div>

          {/* Grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            {items.map((product) => (
              <motion.div key={product.slug} variants={staggerItem}>
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </Container>
      </div>
      <Footer />
    </>
  )
}
