'use client'

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ConditionBadge, LoginRequiredModal } from '@/components/ui'
import { CompareToast } from '@/components/ui/CompareToast'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCompareStore } from '@/stores/compareStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useToastStore } from '@/stores/toastStore'
import type { Product } from '@/types'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)

  const addToCart = useCartStore((s) => s.addToCart)
  const inCart = useCartStore((s) => s.isInCart(product.slug))
  const cartQty = useCartStore((s) => s.getQuantity(product.slug))

  const addToWishlist = useWishlistStore((s) => s.addToWishlist)
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist)
  const inWishlist = useWishlistStore((s) => s.isInWishlist(product.slug))

  const addToCompare = useCompareStore((s) => s.addToCompare)
  const inCompare = useCompareStore((s) => s.isInCompare(product.slug))

  useEffect(() => { useCompareStore.getState().hydrate() }, [])

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault()
    const result = addToCompare(product.slug)
    if (result === 'added') setToast({ message: `${product.name} added to comparison`, type: 'success' })
    else if (result === 'already') setToast({ message: 'Already in comparison', type: 'success' })
    else setToast({ message: 'Comparison is full (3 max). Remove one first.', type: 'error' })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  const addToast = useToastStore((s) => s.addToast)

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isLoggedIn) { setLoginModalOpen(true); return }
    if (product.stock <= 0) return
    if (cartQty < product.stock) {
      addToCart(product.slug)
      addToast(`Added to cart: ${product.name}`)
    }
  }

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isLoggedIn) { setLoginModalOpen(true); return }
    if (inWishlist) {
      removeFromWishlist(product.slug)
      addToast(`Removed from wishlist`, 'info')
    } else {
      addToWishlist(product.slug)
      addToast(`Added to wishlist: ${product.name}`)
    }
  }

  return (
    <>
      <Link
        href={`/products/${product.slug}`}
        className="group block overflow-hidden rounded-lg border border-repixl-muted/10 bg-repixl-charcoal transition-colors hover:border-repixl-muted/30"
      >
        <div className="relative aspect-square overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.image} alt={product.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />

          <div className="absolute right-3 top-3 flex flex-col gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <button type="button" aria-label={inCart ? `${product.name} is in cart` : `Add ${product.name} to cart`} onClick={handleCartClick} disabled={product.stock === 0} className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${product.stock === 0 ? 'bg-repixl-bg/40 text-repixl-muted/40 cursor-not-allowed' : inCart ? 'bg-repixl-red text-white' : 'bg-repixl-bg/80 text-repixl-text-light hover:bg-repixl-red hover:text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
            </button>
            <button type="button" aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`} onClick={handleWishlistClick} className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${inWishlist ? 'bg-repixl-red text-white' : 'bg-repixl-bg/80 text-repixl-text-light hover:bg-repixl-red hover:text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
            </button>
            <button type="button" aria-label={inCompare ? `${product.name} is in comparison` : `Add ${product.name} to comparison`} onClick={handleCompareClick} className={`flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${inCompare ? 'bg-repixl-red text-white' : 'bg-repixl-bg/80 text-repixl-text-light hover:bg-repixl-red hover:text-white'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
            </button>
          </div>

          <div className="absolute bottom-3 left-3"><ConditionBadge condition={product.condition} /></div>
        </div>

        <div className="p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{product.brand}</p>
          <h3 className="mt-1 text-sm font-medium text-repixl-text-light">{product.name}</h3>
          <CardRating slug={product.slug} />
          <div className="mt-2 flex items-center justify-between">
            <p className="font-display text-lg font-semibold text-repixl-text-light">${product.price}</p>
            {product.stock === 0 ? (
              <span className="font-mono text-[10px] text-repixl-red">Out of stock</span>
            ) : product.stock === 1 ? (
              <span className="font-mono text-[10px] text-repixl-warning">Only 1 left</span>
            ) : (
              <span className="font-mono text-[10px] text-repixl-success">{product.stock} in stock</span>
            )}
          </div>
        </div>
      </Link>

      <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      {toast && <CompareToast message={toast.message} type={toast.type} visible={!!toast} onDismiss={dismissToast} />}
    </>
  )
}

function CardRating({ slug }: { slug: string }) {
  const reviews = useReviewStore((s) => s.reviews)
  const productReviews = reviews.filter((r) => r.productSlug === slug)
  const count = productReviews.length
  const avg = count > 0 ? productReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0
  if (count === 0) return null
  return (
    <div className="mt-1 flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill={i < Math.round(avg) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < Math.round(avg) ? 'text-repixl-warning' : 'text-repixl-muted/40'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span className="font-mono text-[9px] text-repixl-muted">({count})</span>
    </div>
  )
}
