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

/**
 * ProductCard — enforces equal card height regardless of content.
 *
 * Card is a flex column:
 *   ┌─────────────────────────────┐
 *   │  IMAGE (fixed aspect-square)│  flex-shrink-0
 *   ├─────────────────────────────┤
 *   │  BODY (flex-1, flex col)    │
 *   │    brand label              │
 *   │    name (2-line clamp)      │
 *   │    rating (reserved space)  │
 *   │    ── spacer ──             │  flex-1 pushes price to bottom
 *   │    price + stock            │  always at bottom
 *   └─────────────────────────────┘
 */
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

  // Clamp stock to avoid negative display
  const stock = Math.max(0, product.stock)

  const handleCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isLoggedIn) { setLoginModalOpen(true); return }
    if (stock <= 0) return
    if (cartQty < stock) {
      addToCart(product.slug)
      addToast(
        `${product.name} added to cart`,
        'success',
        { label: 'View Cart', href: '/cart' },
        5000,
        product.image
      )
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
      addToast(
        `${product.name} saved to wishlist`,
        'success',
        { label: 'View Wishlist', href: '/wishlist' },
        5000,
        product.image
      )
    }
  }

  return (
    <>
      {/*
       * h-full makes the card fill its grid cell so every card in a row is
       * the same height. The flex-col layout pins the price row to the bottom.
       */}
      <Link
        href={`/products/${product.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal transition-all duration-300 hover:border-repixl-muted/25 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
      >
        {/* ── Image — always square, never stretches the card ── */}
        <div className="relative aspect-square w-full flex-shrink-0 overflow-hidden bg-repixl-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.06]"
          />

          {/* Out-of-stock overlay */}
          {stock <= 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-repixl-bg/70 backdrop-blur-sm">
              <span className="rounded-full border border-repixl-red/40 bg-repixl-bg/90 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-repixl-red">
                Out of Stock
              </span>
            </div>
          )}

          {/* Condition badge — fades out on hover */}
          <div className="absolute bottom-3 left-3 transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-1">
            <ConditionBadge condition={product.condition} />
          </div>

          {/* Spec tag — slides up on hover */}
          <div className="absolute bottom-3 left-3 translate-y-2 rounded-xl border border-repixl-muted/10 bg-repixl-bone px-2.5 py-1.5 opacity-0 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <p className="whitespace-nowrap font-mono text-[9px] font-medium leading-relaxed text-repixl-text-dark/75">
              {product.specs.year} · {product.specs.megapixels}MP · {product.specs.zoom}
            </p>
          </div>

          {/* Action buttons — top-right, revealed on hover */}
          <div className="absolute right-2.5 top-2.5 flex flex-col gap-1.5 opacity-0 transition-all duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
            <ActionBtn
              active={inCart}
              disabled={stock <= 0}
              label={inCart ? `${product.name} is in cart` : `Add ${product.name} to cart`}
              onClick={handleCartClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </ActionBtn>
            <ActionBtn
              active={inWishlist}
              label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
              onClick={handleWishlistClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </ActionBtn>
            <ActionBtn
              active={inCompare}
              label={inCompare ? `${product.name} is in comparison` : `Add ${product.name} to comparison`}
              onClick={handleCompareClick}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" />
              </svg>
            </ActionBtn>
          </div>
        </div>

        {/* ── Card body — flex-col so price row is always pinned at bottom ── */}
        <div className="flex flex-1 flex-col p-4">
          {/* Brand */}
          <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{product.brand}</p>

          {/* Name — 2-line clamp prevents height variation */}
          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-repixl-text-light">
            {product.name}
          </h3>

          {/* Rating row — always occupies space (even when empty) */}
          <div className="mt-1.5 h-4">
            <CardRating slug={product.slug} />
          </div>

          {/* Spacer — pushes price row to the bottom of the card */}
          <div className="flex-1" />

          {/* Price + stock — always at the bottom */}
          <div className="mt-3 flex items-center justify-between border-t border-repixl-muted/8 pt-3">
            <p className="font-display text-xl font-bold text-repixl-text-light">${product.price}</p>
            <div className="flex items-center gap-1.5">
              {stock <= 0 ? (
                <span className="font-mono text-[9px] text-repixl-red/70">Out of stock</span>
              ) : stock <= 2 ? (
                <span className="font-mono text-[9px] text-repixl-warning">Only {stock} left</span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-[9px] text-repixl-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-repixl-success" />
                  In stock
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>

      <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      {toast && <CompareToast message={toast.message} type={toast.type} visible={!!toast} onDismiss={dismissToast} />}
    </>
  )
}

// ─── Small reusable action button ─────────────────────────────────────────────
function ActionBtn({
  active,
  disabled,
  label,
  onClick,
  children,
}: {
  active: boolean
  disabled?: boolean
  label: string
  onClick: (e: React.MouseEvent) => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-xl backdrop-blur-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 ${
        disabled
          ? 'cursor-not-allowed bg-repixl-bg/50 text-repixl-muted/30'
          : active
            ? 'bg-repixl-red text-white shadow-md shadow-repixl-red/30'
            : 'bg-repixl-charcoal/80 text-repixl-text-light hover:bg-repixl-red hover:text-white hover:shadow-md hover:shadow-repixl-red/30'
      }`}
    >
      {children}
    </button>
  )
}

// ─── Card rating display ───────────────────────────────────────────────────────
function CardRating({ slug }: { slug: string }) {
  const reviews = useReviewStore((s) => s.reviews)
  const productReviews = reviews.filter((r) => r.productSlug === slug)
  const count = productReviews.length
  const avg = count > 0 ? productReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {Array.from({ length: 5 }, (_, i) => (
          <svg key={i} xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24"
            fill={i < Math.round(avg) ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="1.5"
            className={i < Math.round(avg) ? 'text-repixl-warning' : 'text-repixl-muted/30'}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        ))}
      </div>
      <span className="font-mono text-[9px] text-repixl-muted">({count})</span>
    </div>
  )
}
