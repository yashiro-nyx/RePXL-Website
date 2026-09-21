'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ConditionBadge, LoginRequiredModal } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useToastStore } from '@/stores/toastStore'
import { useThemeStore } from '@/stores/themeStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { reportActionFailure } from '@/lib/action-error'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types'

export interface ProductCardProps {
  product: Product
  /** Optional deterministic geometry variant (0-3). Defaults to hashing product.slug */
  variant?: number
  className?: string
}

/**
 * Extract recognizable camera family/series from real product data.
 * Examples:
 *  - Panasonic Lumix DMC-FZ7 -> LUMIX
 *  - Fujifilm FinePix F30   -> FINEPIX
 *  - Sony CyberShot W800    -> CYBERSHOT
 *  - Canon PowerShot A520   -> POWERSHOT
 *  - Kodak PixPro FZ53      -> PIXPRO
 *  - Nikon Coolpix S710     -> COOLPIX
 *  - Canon IXUS 980 IS      -> IXUS
 */
export function extractCameraFamily(product: { name: string; brand: string; series?: string }): string | null {
  const textToSearch = `${product.series || ''} ${product.name || ''}`.toUpperCase()

  const FAMILIES = [
    'POWERSHOT',
    'CYBERSHOT',
    'CYBER-SHOT',
    'FINEPIX',
    'COOLPIX',
    'PIXPRO',
    'LUMIX',
    'IXUS',
    'EASYSHARE',
    'EXILIM',
    'CAMEDIA',
    'MAVICA',
    'OPTIO',
    'DYNAX',
    'ALPHA',
  ]

  for (const fam of FAMILIES) {
    if (textToSearch.includes(fam)) {
      if (fam === 'CYBER-SHOT') return 'CYBERSHOT'
      return fam
    }
  }

  if (product.series && product.series.trim().length >= 3 && !product.series.includes(' ')) {
    return product.series.trim().toUpperCase()
  }

  if (product.brand && product.brand.trim()) {
    return product.brand.trim().toUpperCase()
  }

  return null
}

/**
 * Length-aware font sizing for outlined family text so it spans ~75-92% of the card
 * width without being clipped awkwardly across card edges.
 */
function getFamilyTextStyle(word: string) {
  const len = word.length
  if (len <= 5) {
    // LUMIX (5), IXUS (4)
    return {
      fontSize: 'clamp(2.6rem, 5.8vw, 3.6rem)',
      letterSpacing: '0.14em',
    }
  } else if (len <= 7) {
    // FINEPIX (7), COOLPIX (7), PIXPRO (6)
    return {
      fontSize: 'clamp(2.1rem, 4.6vw, 2.9rem)',
      letterSpacing: '0.08em',
    }
  } else if (len <= 9) {
    // CYBERSHOT (9), POWERSHOT (9)
    return {
      fontSize: 'clamp(1.65rem, 3.7vw, 2.35rem)',
      letterSpacing: '0.04em',
    }
  } else {
    // Longer words
    return {
      fontSize: 'clamp(1.4rem, 3.1vw, 2.0rem)',
      letterSpacing: '0.02em',
    }
  }
}

/**
 * Geometric background decorations behind the camera.
 * Matches the reference composition:
 *  - Clearly visible filled dark crimson shapes/gradients
 *  - Thin red curved arc lines
 *  - Deterministic secondary details (crosshairs, dot matrix)
 */
function CardGeometry({ variant, isLight }: { variant: number; isLight: boolean }) {
  const v = variant % 4

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1] overflow-hidden select-none"
    >
      {v === 0 && (
        <>
          {/* Card 1: Filled deep-crimson circle on right behind camera */}
          <div
            className="absolute top-10 -right-6 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(220, 38, 38, 0.16) 0%, rgba(185, 28, 28, 0.07) 55%, transparent 72%)'
                : 'radial-gradient(circle, rgba(160, 26, 26, 0.45) 0%, rgba(95, 12, 12, 0.25) 60%, transparent 75%)',
            }}
          />
          {/* Thin red arc line */}
          <svg
            className={`absolute top-8 -right-8 h-52 w-52 ${isLight ? 'opacity-45' : 'opacity-40'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="88" stroke={isLight ? '#B91C1C' : '#D32F2F'} strokeWidth="1" />
          </svg>
        </>
      )}

      {v === 1 && (
        <>
          {/* Card 2: Soft red diffuse filled shape behind camera */}
          <div
            className="absolute top-14 left-4 h-44 w-44 rounded-full blur-[3px]"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.06) 60%, transparent 72%)'
                : 'radial-gradient(circle, rgba(160, 26, 26, 0.42) 0%, rgba(95, 12, 12, 0.2) 65%, transparent 75%)',
            }}
          />
          {/* Thin red arc */}
          <svg
            className={`absolute top-10 left-0 h-48 w-48 ${isLight ? 'opacity-40' : 'opacity-35'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle
              cx="100"
              cy="100"
              r="82"
              stroke={isLight ? '#B91C1C' : '#D32F2F'}
              strokeWidth="1"
              strokeDasharray="5 3"
            />
          </svg>
          {/* '+' crosshair at bottom-left */}
          <span className={`absolute bottom-6 left-5 font-mono text-sm select-none ${isLight ? 'text-neutral-500/60' : 'text-neutral-400/50'}`}>
            +
          </span>
        </>
      )}

      {v === 2 && (
        <>
          {/* Card 3: Filled deep-crimson ellipse on right side */}
          <div
            className="absolute top-12 -right-8 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(220, 38, 38, 0.16) 0%, rgba(185, 28, 28, 0.07) 55%, transparent 72%)'
                : 'radial-gradient(circle, rgba(160, 26, 26, 0.45) 0%, rgba(85, 10, 10, 0.22) 60%, transparent 75%)',
            }}
          />
          {/* Thin red arc line */}
          <svg
            className={`absolute top-8 -right-10 h-52 w-52 ${isLight ? 'opacity-45' : 'opacity-40'}`}
            viewBox="0 0 200 200"
            fill="none"
          >
            <circle cx="100" cy="100" r="90" stroke={isLight ? '#B91C1C' : '#D32F2F'} strokeWidth="1" />
          </svg>
          {/* Dotted grid on left */}
          <div className={`absolute top-16 left-6 grid grid-cols-2 gap-2 ${isLight ? 'opacity-40' : 'opacity-35'}`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className={`h-0.5 w-0.5 rounded-full ${isLight ? 'bg-neutral-800/40' : 'bg-white/70'}`} />
            ))}
          </div>
        </>
      )}

      {v === 3 && (
        <>
          {/* Card 4: Deep red filled arc on right */}
          <div
            className="absolute top-10 -right-4 h-48 w-48 rounded-full blur-[2px]"
            style={{
              background: isLight
                ? 'radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(185, 28, 28, 0.06) 55%, transparent 72%)'
                : 'radial-gradient(circle, rgba(160, 26, 26, 0.42) 0%, rgba(80, 10, 10, 0.2) 60%, transparent 75%)',
            }}
          />
          {/* Concentric red arcs */}
          <svg
            className={`absolute -bottom-4 -left-6 h-40 w-40 ${isLight ? 'opacity-35' : 'opacity-30'}`}
            viewBox="0 0 160 160"
            fill="none"
          >
            <circle cx="80" cy="80" r="72" stroke={isLight ? '#B91C1C' : '#D32F2F'} strokeWidth="0.8" />
          </svg>
          {/* '+' crosshair at upper-right */}
          <span className={`absolute top-12 right-6 font-mono text-sm select-none ${isLight ? 'text-neutral-500/60' : 'text-neutral-400/50'}`}>
            +
          </span>
          {/* Dot cluster at lower-right */}
          <div className={`absolute bottom-8 right-6 grid grid-cols-2 gap-1.5 ${isLight ? 'opacity-35' : 'opacity-30'}`}>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className={`h-0.5 w-0.5 rounded-full ${isLight ? 'bg-neutral-800/40' : 'bg-white/70'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Standardized continuous editorial ProductCard for RePXL.
 *
 * Implements the layered visual composition matching the reference screenshot:
 *  - Condition badge (top left) & minimal heart icon (top right)
 *  - Clearly visible outlined camera-family typography (LUMIX, FINEPIX, CYBERSHOT, POWERSHOT)
 *  - Filled dark-red geometric shape and thin arc lines framing the camera
 *  - Large prominent camera image overlapping the lower half of the word and red geometry
 *  - Integrated product info: Brand uppercase letter-spaced, Product Name, Warm gold 5-star rating
 *  - Bottom row: PHP price on left, 48-52px circular red-outlined cart control with shopping cart icon on right
 *  - Equal card height and consistent composition across all catalog grids
 */
export function ProductCard({
  product,
  variant,
  className = '',
}: ProductCardProps) {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [cartLoading, setCartLoading] = useState(false)
  const reducedMotion = useReducedMotion()
  const theme = useThemeStore((s) => s.theme)
  const isLight = theme === 'light'

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const addToast = useToastStore((s) => s.addToast)

  // Cart integration
  const addToCart = useCartStore((s) => s.addToCart)
  const inCart = useCartStore((s) => s.isInCart(product.slug))
  const cartQty = useCartStore((s) => s.getQuantity(product.slug))

  // Wishlist integration
  const addToWishlist = useWishlistStore((s) => s.addToWishlist)
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist)
  const inWishlist = useWishlistStore((s) => s.isInWishlist(product.slug))

  // Real reviews integration (bulk hydrated, 0 extra API calls)
  const allReviews = useReviewStore((s) => s.reviews)
  const productReviews = useMemo(
    () => allReviews.filter((r) => r.productSlug === product.slug),
    [allReviews, product.slug]
  )
  const reviewCount = productReviews.length
  const avgRating =
    reviewCount > 0
      ? productReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
      : 0

  // Stock clamping
  const stock = Math.max(0, product.stock ?? 0)
  const isOutOfStock = stock <= 0
  const isMaxCartQty = cartQty >= stock && stock > 0

  // Deterministic geometry variant
  const geomVariant = useMemo(() => {
    if (typeof variant === 'number') return variant
    let hash = 0
    for (let i = 0; i < product.slug.length; i++) {
      hash = (hash << 5) - hash + product.slug.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash) % 4
  }, [variant, product.slug])

  // Extract recognizable camera family token from real data
  const familyText = useMemo(() => {
    return extractCameraFamily(product)
  }, [product])

  // Handlers
  const handleWishlistClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      setLoginModalOpen(true)
      return
    }

    try {
      if (inWishlist) {
        await removeFromWishlist(product.slug)
        addToast('Removed from wishlist', 'info')
      } else {
        await addToWishlist(product.slug)
        addToast(
          `${product.name} saved to wishlist`,
          'success',
          { label: 'View Wishlist', href: '/wishlist' },
          5000,
          product.image
        )
      }
    } catch {
      reportActionFailure()
    }
  }

  const handleCartClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!isLoggedIn) {
      setLoginModalOpen(true)
      return
    }

    if (isOutOfStock) return

    if (isMaxCartQty) {
      addToast(`Max available stock (${stock}) already in cart`, 'info')
      return
    }

    if (cartLoading) return

    setCartLoading(true)
    try {
      await addToCart(product.slug, 1)
      addToast(
        `${product.name} added to cart`,
        'success',
        { label: 'View Cart', href: '/cart' },
        5000,
        product.image
      )
    } catch {
      reportActionFailure()
    } finally {
      setCartLoading(false)
    }
  }

  return (
    <>
      <article
        className={`group relative flex h-full min-h-[440px] flex-col overflow-hidden rounded-2xl border transition-all duration-300 ${
          isLight
            ? 'border-neutral-200/90 bg-white shadow-sm hover:border-[#B91C1C]/50 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.15)]'
            : 'border-white/10 bg-[#110F13] hover:border-[#B91C1C]/50 hover:shadow-[0_12px_32px_-8px_rgba(185,28,28,0.3)]'
        } ${className}`}
      >
        {/* Subtle internal gradient for editorial depth */}
        <div
          className={`pointer-events-none absolute inset-0 ${
            isLight
              ? 'bg-gradient-to-b from-black/[0.015] via-transparent to-transparent'
              : 'bg-gradient-to-b from-white/[0.03] via-transparent to-black/40'
          }`}
          aria-hidden="true"
        />

        {/* ── 1. CONTROLLED VISUAL STAGE (Layered composition) ── */}
        <div className="relative h-64 sm:h-72 w-full overflow-hidden flex-shrink-0">
          {/* Top Controls: Condition badge & Minimal Heart */}
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between p-4">
            {/* Condition badge — top left */}
            <div>
              <ConditionBadge condition={product.condition} />
            </div>

            {/* Minimal Wishlist Heart — top right */}
            <button
              type="button"
              aria-label={
                inWishlist
                  ? `Remove ${product.name} from wishlist`
                  : `Add ${product.name} to wishlist`
              }
              onClick={handleWishlistClick}
              className={`flex h-7 w-7 items-center justify-center p-1 transition-colors focus-visible:outline-none ${
                isLight
                  ? 'text-neutral-500 hover:text-black'
                  : 'text-neutral-400/90 hover:text-white'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill={inWishlist ? '#D32F2F' : 'none'}
                stroke={
                  inWishlist
                    ? '#D32F2F'
                    : isLight
                      ? 'rgba(26, 22, 16, 0.65)'
                      : 'rgba(255, 255, 255, 0.75)'
                }
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-transform duration-200 hover:scale-110"
                aria-hidden="true"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
            </button>
          </div>

          {/* Layer 1: Atmospheric Red Geometric Background Elements */}
          <CardGeometry variant={geomVariant} isLight={isLight} />

          {/* Layer 2: Clearly Visible Outlined Camera-Family Typography */}
          {familyText && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-11 sm:top-12 z-[2] flex items-center justify-center px-4 overflow-hidden select-none"
            >
              <span
                className={`select-none font-display font-black uppercase whitespace-nowrap text-center transition-opacity duration-300 ${
                  isLight
                    ? 'opacity-30 group-hover:opacity-40'
                    : 'opacity-25 group-hover:opacity-35'
                }`}
                style={{
                  ...getFamilyTextStyle(familyText),
                  WebkitTextStroke: isLight
                    ? '1.2px rgba(26, 22, 16, 0.22)'
                    : '1.2px rgba(255, 255, 255, 0.28)',
                  color: 'transparent',
                }}
              >
                {familyText}
              </span>
            </div>
          )}

          {/* Layer 3: Prominent Floating Camera PNG (Overlaps lower half of text & red geometry) */}
          <div className="relative z-[3] flex h-full w-full items-center justify-center px-6 pt-14 pb-2">
            <Link
              href={`/products/${product.slug}`}
              tabIndex={-1}
              aria-hidden="true"
              className="relative flex h-full w-full items-center justify-center"
            >
              <Image
                src={product.image}
                alt={product.name}
                width={360}
                height={270}
                sizes="(max-width: 640px) 90vw, (max-width: 1024px) 45vw, 360px"
                quality={90}
                className={`max-h-[82%] max-w-[85%] h-auto w-auto object-contain transition-transform duration-500 ease-out ${
                  isLight
                    ? 'drop-shadow-[0_10px_20px_rgba(0,0,0,0.18)]'
                    : 'drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]'
                } ${
                  reducedMotion
                    ? ''
                    : 'group-hover:scale-[1.04] group-hover:-translate-y-1'
                }`}
              />
            </Link>
          </div>

          {/* Out of Stock overlay if sold out */}
          {isOutOfStock && (
            <div className={`absolute inset-0 z-[4] flex items-center justify-center ${isLight ? 'bg-white/75 backdrop-blur-[2px]' : 'bg-black/60 backdrop-blur-[2px]'}`}>
              <span className={`rounded-full border border-repixl-red/50 px-3.5 py-1 font-mono text-[10px] uppercase tracking-widest text-repixl-red font-semibold ${isLight ? 'bg-white/95' : 'bg-[#121013]/95'}`}>
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* ── 2. COMPACT PRODUCT INFORMATION (Seamless continuous composition) ── */}
        <div className="flex flex-1 flex-col px-5 pb-5 pt-1.5">
          {/* Brand */}
          <p className={`font-mono text-[10px] uppercase tracking-[0.2em] font-semibold ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            {product.brand}
          </p>

          {/* Product Name in original RePXL typography with full-card stretched link */}
          <h3 className={`mt-1 line-clamp-1 text-[15px] font-medium transition-colors ${isLight ? 'text-neutral-900' : 'text-white'}`}>
            <Link
              href={`/products/${product.slug}`}
              className="focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-repixl-red rounded-sm after:absolute after:inset-0 after:z-0"
            >
              {product.name}
            </Link>
          </h3>

          {/* Real Rating + review count with warm gold stars */}
          <div className="mt-1.5 flex h-5 items-center gap-1.5">
            {reviewCount > 0 ? (
              <div
                className="flex items-center gap-1.5"
                aria-label={`Rated ${avgRating.toFixed(1)} out of 5 stars from ${reviewCount} reviews`}
              >
                <div className="flex items-center gap-0.5" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => {
                    const filled = i < Math.round(avgRating)
                    return (
                      <svg
                        key={i}
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill={filled ? '#F5A623' : 'none'}
                        stroke={
                          filled
                            ? '#F5A623'
                            : isLight
                              ? '#D1CAC4'
                              : '#47424A'
                        }
                        strokeWidth="1.5"
                      >
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    )
                  })}
                </div>
                <span className={`font-mono text-[11px] ml-1 ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                  {avgRating.toFixed(1)}{' '}
                  <span className={isLight ? 'text-neutral-400' : 'text-neutral-500'}>({reviewCount})</span>
                </span>
              </div>
            ) : (
              <span className={`font-mono text-[10px] ${isLight ? 'text-neutral-400' : 'text-neutral-500'}`}>
                Unrated
              </span>
            )}
          </div>

          {/* Spacer pushing Price & Cart button to bottom */}
          <div className="mt-auto pt-3" />

          {/* ── 3. BOTTOM ROW: Price on Left, Circular Cart Button on Right ── */}
          <div className="relative z-10 flex items-center justify-between pt-1">
            {/* Price */}
            <div className="flex flex-col">
              <span className={`font-display text-xl font-bold tracking-tight ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                {formatPrice(product.price)}
              </span>
              {isOutOfStock && (
                <span className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-red">
                  Out of stock
                </span>
              )}
            </div>

            {/* Circular Cart Button (~48px, dark center in dark mode / clean white in light mode, red outline) */}
            {(() => {
              let cartAriaLabel: string
              if (isOutOfStock) {
                cartAriaLabel = `${product.name} is out of stock`
              } else if (cartLoading) {
                cartAriaLabel = `Adding ${product.name} to cart…`
              } else if (isMaxCartQty) {
                cartAriaLabel = `Max stock (${stock}) reached for ${product.name}`
              } else if (inCart) {
                cartAriaLabel = `Add another ${product.name} to cart (${cartQty} in cart)`
              } else {
                cartAriaLabel = `Add ${product.name} to cart`
              }

              const cartButtonStyle = isOutOfStock || isMaxCartQty
                ? isLight
                  ? 'cursor-not-allowed border-neutral-300 bg-neutral-100 text-neutral-400 opacity-40'
                  : 'cursor-not-allowed border-neutral-800 bg-[#121113] text-neutral-600 opacity-40'
                : cartLoading
                  ? isLight
                    ? 'cursor-wait border-[#B91C1C] bg-[#B91C1C]/10 text-[#B91C1C]'
                    : 'cursor-wait border-[#B91C1C] bg-[#B91C1C]/20 text-[#EF4444]'
                  : inCart
                    ? isLight
                      ? 'border-[#B91C1C] bg-[#B91C1C]/10 text-[#B91C1C] hover:bg-[#B91C1C]/20 shadow-[0_0_12px_rgba(185,28,28,0.2)]'
                      : 'border-[#B91C1C] bg-[#B91C1C]/20 text-[#EF4444] hover:bg-[#B91C1C]/30 shadow-[0_0_16px_rgba(239,68,68,0.4)]'
                    : isLight
                      ? 'border-[#B91C1C] bg-white text-neutral-900 hover:border-[#EF4444] hover:bg-[#B91C1C]/10 hover:shadow-[0_0_14px_rgba(185,28,28,0.2)]'
                      : 'border-[#B91C1C] bg-[#161217] text-white hover:border-[#EF4444] hover:bg-[#B91C1C]/20 hover:shadow-[0_0_18px_rgba(239,68,68,0.45)]'

              return (
                <button
                  type="button"
                  disabled={isOutOfStock || cartLoading || isMaxCartQty}
                  onClick={handleCartClick}
                  aria-label={cartAriaLabel}
                  className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red ${cartButtonStyle}`}
                >
                  {cartLoading ? (
                    /* Animated spinner during async add-to-cart request */
                    <svg
                      className="animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    /* Classic wheeled shopping cart icon — ALWAYS visible, no persistent checkmark */
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="8" cy="21" r="1" />
                      <circle cx="19" cy="21" r="1" />
                      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
                    </svg>
                  )}
                </button>
              )
            })()}
          </div>
        </div>
      </article>

      {/* Login required modal triggered when unauthenticated user taps wishlist/cart */}
      <LoginRequiredModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />
    </>
  )
}
