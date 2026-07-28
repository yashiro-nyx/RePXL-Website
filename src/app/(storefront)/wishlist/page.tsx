'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui'
import { ProductCard } from '@/components/product/ProductCard'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useAuthStore } from '@/stores/authStore'

export default function WishlistPage() {
  const wishlistSlugs = useWishlistStore((s) => s.slugs)
  const allProducts = useProductStore((s) => s.products)

  useEffect(() => {
    useWishlistStore.getState().hydrate()
    useProductStore.getState().hydrate()
    useCartStore.getState().hydrate()
    useAuthStore.getState().hydrate()
  }, [])

  const items = wishlistSlugs
    .map((slug) => allProducts.find((p) => p.slug === slug))
    .filter(Boolean) as typeof allProducts

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-repixl-bg pb-16 pt-24">
        <Container>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
            <h1 className="mt-6 font-display text-display-md text-repixl-text-light">Nothing saved yet</h1>
            <p className="mt-2 text-sm text-repixl-muted">Browse cameras and tap the heart to save them here.</p>
            <Link href="/products" className="mt-6"><Button variant="primary" size="lg">Browse Cameras</Button></Link>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-repixl-bg pb-16 pt-24">
      <Container>
        <h1 className="font-display text-display-md text-repixl-text-light md:text-display-lg">My Wishlist</h1>
        <p className="mt-1 text-sm text-repixl-muted">{items.length} {items.length === 1 ? 'camera' : 'cameras'} saved</p>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </Container>
    </div>
  )
}
