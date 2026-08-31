'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Button, ConditionBadge, CornerBracket, LoginRequiredModal } from '@/components/ui'
import { CompareToast } from '@/components/ui/CompareToast'
import { ProductCard } from '@/components/product/ProductCard'
import { getColorProfile } from '@/data/colorProfiles'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'
import { useCompareStore } from '@/stores/compareStore'
import { useReviewStore, type Review } from '@/stores/reviewStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { useProductStore } from '@/stores/productStore'
import { useToastStore } from '@/stores/toastStore'
import { useScrollLock } from '@/hooks/useScrollLock'

// Dynamically import the webcam-dependent component to avoid SSR issues
const CameraFilterDemo = dynamic(
  () => import('@/components/product/CameraFilterDemo').then((mod) => ({ default: mod.CameraFilterDemo })),
  { ssr: false }
)

function FilterDemoButton({ brand, model, slug }: { brand: string; model: string; slug: string }) {
  const [open, setOpen] = useState(false)
  const profile = getColorProfile(brand, slug)

  useScrollLock(open)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-xl px-5 py-3.5 text-sm font-medium transition-all hover:brightness-110 hover:shadow-lg"
        style={{ background: '#f2e2d8', color: '#171b21', boxShadow: '0 4px 16px -4px rgba(242, 226, 216, 0.3)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-[#8b3a2a]">
          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" />
        </svg>
        <span className="flex-1 text-left">
          <span className="block font-semibold">Try the Look — {profile.name}</span>
          <span className="block text-[10px] font-normal text-[#5a3a30]">{profile.description}</span>
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[#8b3a2a]">
          <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">Try the Look</h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{profile.name}</p>
              </div>
              <button onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-repixl-muted hover:bg-repixl-bg hover:text-repixl-text-light">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>
            <CameraFilterDemo brand={brand} model={model} slug={slug} />
          </div>
        </div>
      )}
    </>
  )
}

export default function ProductDetailPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const params = useParams<{ slug: string }>()
  const router = useRouter()

  const allProducts = useProductStore((s) => s.products)
  const product = allProducts.find((p) => p.slug === params.slug)

  const addToCart = useCartStore((s) => s.addToCart)
  const addToWishlist = useWishlistStore((s) => s.addToWishlist)
  const removeFromWishlist = useWishlistStore((s) => s.removeFromWishlist)

  const inCart = useCartStore((s) => s.items.some((i) => i.slug === params.slug))
  const cartQty = useCartStore((s) => s.items.find((i) => i.slug === params.slug)?.quantity ?? 0)
  const inWishlist = useWishlistStore((s) => s.isInWishlist(params.slug))

  const addToCompare = useCompareStore((s) => s.addToCompare)
  const inCompare = useCompareStore((s) => s.slugs.includes(params.slug))
  const addToast = useToastStore((s) => s.addToast)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [selectedQty, setSelectedQty] = useState(1)
  const [compareModal, setCompareModal] = useState<'added' | 'full' | null>(null)

  useEffect(() => {
    useProductStore.getState().hydrate()
    useCartStore.getState().hydrate()
    useWishlistStore.getState().hydrate()
    useCompareStore.getState().hydrate()
    useReviewStore.getState().hydrate()
    useOrderHistoryStore.getState().hydrate()
  }, [])

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
        <div className="text-center">
          <h1 className="font-display text-display-lg text-repixl-text-light">
            Camera not found
          </h1>
          <p className="mt-2 text-sm text-repixl-muted">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block text-sm text-repixl-red hover:underline"
          >
            ← Back to all cameras
          </Link>
        </div>
      </div>
    )
  }

  // Related products: same brand, excluding current, fallback to other products
  const related = allProducts
    .filter((p) => p.slug !== product.slug && p.status === 'active')
    .sort((a, b) => {
      if (a.brand === product.brand && b.brand !== product.brand) return -1
      if (b.brand === product.brand && a.brand !== product.brand) return 1
      return 0
    })
    .slice(0, 4)

  return (
    <div className="min-h-screen pt-24 pb-16">
      <Container>
        {/* Breadcrumb + Back */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              <li>
                <Link href="/products" className="hover:text-repixl-text-light">
                  Cameras
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link
                  href={`/products?brand=${product.brand.toLowerCase()}`}
                  className="hover:text-repixl-text-light"
                >
                  {product.brand}
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-repixl-text-light/60">{product.name}</li>
            </ol>
          </nav>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-colors hover:text-repixl-text-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
            Back
          </button>
        </div>

        {/* Main product layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left: Image area */}
          <div>
            <CornerBracket
              size={16}
              color="rgba(140, 133, 128, 0.3)"
              className="relative aspect-square overflow-hidden rounded-lg bg-repixl-charcoal p-6"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={product.image}
                alt={product.name}
                className="h-full w-full object-contain"
              />

              {/* Condition badge — top right of image */}
              <div className="absolute right-8 top-8">
                <ConditionBadge condition={product.condition} />
              </div>
            </CornerBracket>

            {/* Try the Look button — below image */}
            <div className="mt-5 flex justify-center">
              <FilterDemoButton brand={product.brand} model={product.name} slug={product.slug} />
            </div>
          </div>

          {/* Right: Product info */}
          <div className="flex flex-col">
            {/* Brand */}
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              {product.brand} · {product.series}
            </span>

            {/* Name */}
            <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
              {product.name}
            </h1>

            {/* Price + condition + rating */}
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="font-display text-3xl font-bold text-repixl-text-light">
                ${product.price}
              </span>
              <ConditionBadge condition={product.condition} />
              <ProductRatingSummary slug={product.slug} />
            </div>

            {/* Stock status */}
            <div className="mt-4 flex items-center gap-2">
              {product.stock > 0 ? (
                <>
                  <span className={`h-2 w-2 rounded-full ${product.stock <= 2 ? 'bg-repixl-warning' : 'bg-repixl-success'}`} />
                  <span className={`font-mono text-xs ${product.stock <= 2 ? 'text-repixl-warning' : 'text-repixl-success'}`}>
                    In stock — {product.stock} available
                  </span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-repixl-red" />
                  <span className="font-mono text-xs text-repixl-red">Out of stock</span>
                </>
              )}
            </div>

            {/* Quantity selector + Actions */}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {product.stock > 0 && (
                <QuantitySelector
                  value={selectedQty}
                  max={product.stock}
                  onChange={setSelectedQty}
                />
              )}
              <Button
                variant="primary"
                size="lg"
                disabled={product.stock === 0 || cartQty >= product.stock}
                className={product.stock === 0 || cartQty >= product.stock ? 'opacity-50 cursor-not-allowed' : ''}
                onClick={() => {
                  if (!isLoggedIn) { setLoginModalOpen(true); return }
                  if (product && product.stock > 0 && cartQty < product.stock) {
                    addToCart(product.slug, selectedQty)
                    addToast(`Added ${selectedQty} to cart: ${product.name}`)
                  }
                }}
              >
                {product.stock === 0 ? 'Out of Stock' : cartQty >= product.stock ? `Max in Cart (${cartQty})` : inCart ? `Add More to Cart (${cartQty} in cart)` : 'Add to Cart'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (!isLoggedIn) { setLoginModalOpen(true); return }
                  if (product) {
                    if (inWishlist) {
                      removeFromWishlist(product.slug)
                      addToast('Removed from wishlist', 'info')
                    } else {
                      addToWishlist(product.slug)
                      addToast(`Added to wishlist: ${product.name}`)
                    }
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill={inWishlist ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  {inWishlist ? 'In Wishlist' : 'Add to Wishlist'}
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (!product) return
                  if (inCompare) {
                    router.push('/compare')
                    return
                  }
                  const result = addToCompare(product.slug)
                  if (result === 'added') {
                    setCompareModal('added')
                  } else if (result === 'already') {
                    router.push('/compare')
                  } else {
                    setCompareModal('full')
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
                  {inCompare ? 'View Comparison' : '+ Compare'}
                </span>
              </Button>
            </div>

            <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

            {/* Compare confirmation modal */}
            {compareModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="w-full max-w-sm rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
                  {compareModal === 'added' ? (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-success/15">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                      <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Added to Compare</h3>
                      <p className="mt-1 text-center text-sm text-repixl-muted">{product.name} has been added. Would you like to compare now or keep browsing?</p>
                      <div className="mt-5 flex flex-col gap-2">
                        <button onClick={() => { setCompareModal(null); router.push('/compare') }} className="w-full rounded-lg bg-repixl-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Go to Compare</button>
                        <button onClick={() => setCompareModal(null)} className="w-full rounded-lg border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-muted/5 hover:text-repixl-text-light">Continue Browsing</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-warning/15">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-warning"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M3.44 18.67 10.3 4.83a2 2 0 0 1 3.4 0l6.86 13.84A2 2 0 0 1 18.7 21H5.3a2 2 0 0 1-1.86-2.33z" /></svg>
                      </div>
                      <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Compare is Full</h3>
                      <p className="mt-1 text-center text-sm text-repixl-muted">You can compare up to 3 cameras. Remove one to add {product.name}.</p>
                      <div className="mt-5 flex flex-col gap-2">
                        <button onClick={() => { setCompareModal(null); router.push('/compare') }} className="w-full rounded-lg bg-repixl-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Manage Compare List</button>
                        <button onClick={() => setCompareModal(null)} className="w-full rounded-lg border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-muted/5 hover:text-repixl-text-light">Close</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
            {toast && (
              <CompareToast message={toast.message} type={toast.type} visible={!!toast} onDismiss={() => setToast(null)} />
            )}

            {/* Description */}
            <div className="mt-8 border-t border-repixl-muted/10 pt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                About this camera
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-repixl-text-light/80">
                {product.description}
              </p>
            </div>

            {/* Spec sheet */}
            <div className="mt-10 border-t border-repixl-muted/10 pt-8">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                Specifications
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3">
                <SpecRow label="Resolution" value={`${product.specs.megapixels} MP`} />
                <SpecRow label="Zoom" value={product.specs.zoom} />
                <SpecRow label="Storage" value={product.specs.storage} />
                <SpecRow label="Year" value={String(product.specs.year)} />
                <SpecRow label="Condition" value={product.condition.charAt(0).toUpperCase() + product.condition.slice(1)} />
                <SpecRow label="Brand" value={product.brand} />
              </dl>
            </div>

            {/* Serial / authenticity note */}
            <div className="mt-8 rounded border border-repixl-muted/10 bg-repixl-charcoal p-4">
              <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                Authenticity
              </p>
              <p className="mt-2 text-sm text-repixl-text-light/70">
                Serial number verified. Multi-angle photos available.
                This camera has been inspected and graded by our team.
              </p>
            </div>
          </div>
        </div>

        {/* Reviews section */}
        <ProductReviews slug={product.slug} />

        {/* Related products */}
        <section className="mt-20 border-t border-repixl-muted/10 pt-12">
          <h2 className="font-display text-display-sm text-repixl-text-light md:text-display-md">
            You might also like
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      </Container>
      <Footer />
    </div>
  )
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-mono text-sm text-repixl-text-light">
        {value}
      </dd>
    </div>
  )
}

function QuantitySelector({ value, max, onChange }: { value: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="inline-flex items-center rounded border border-repixl-muted/20 bg-repixl-charcoal">
      <button
        type="button"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        aria-label="Decrease quantity"
        className="flex h-11 w-10 items-center justify-center font-mono text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30"
      >
        −
      </button>
      <span className="flex h-11 w-10 items-center justify-center border-x border-repixl-muted/20 font-mono text-sm font-medium text-repixl-text-light">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Increase quantity"
        className="flex h-11 w-10 items-center justify-center font-mono text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30"
      >
        +
      </button>
    </div>
  )
}

function StarDisplay({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={i < Math.round(rating) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < Math.round(rating) ? 'text-repixl-warning' : 'text-repixl-muted/40'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

function ProductRatingSummary({ slug }: { slug: string }) {
  const reviews = useReviewStore((s) => s.reviews)
  const productReviews = reviews.filter((r) => r.productSlug === slug)
  const count = productReviews.length
  const avg = count > 0 ? productReviews.reduce((sum, r) => sum + r.rating, 0) / count : 0
  if (count === 0) return null
  return (
    <div className="flex items-center gap-1.5">
      <StarDisplay rating={avg} size={12} />
      <span className="font-mono text-[10px] text-repixl-muted">({count})</span>
    </div>
  )
}

function ProductReviews({ slug }: { slug: string }) {
  const allReviews = useReviewStore((s) => s.reviews)
  const reviews = allReviews.filter((r) => r.productSlug === slug)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const userEmail = useAuthStore((s) => s.userEmail)
  const existingReview = allReviews.find((r) => r.reviewerEmail === userEmail && r.productSlug === slug)
  const [showForm, setShowForm] = useState(false)
  const [loginModalOpen, setLoginModalOpen] = useState(false)

  const handleWriteReview = () => {
    if (!isLoggedIn) { setLoginModalOpen(true); return }
    setShowForm(true)
  }

  return (
    <section className="mt-16 border-t border-repixl-muted/10 pt-12">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-display-sm text-repixl-text-light">Reviews</h2>
        {!showForm && (
          <Button variant="secondary" size="sm" onClick={handleWriteReview}>
            {existingReview ? 'Edit Your Review' : 'Write a Review'}
          </Button>
        )}
      </div>

      {showForm && (
        <ReviewForm slug={slug} existing={existingReview} onClose={() => setShowForm(false)} />
      )}

      {reviews.length === 0 && !showForm && (
        <p className="mt-6 text-sm text-repixl-muted">No reviews yet. Be the first to share your experience.</p>
      )}

      {reviews.length > 0 && (
        <div className="mt-6 space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4">
              <div className="flex items-start justify-between">
                <div>
                  <StarDisplay rating={review.rating} size={12} />
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-medium text-repixl-text-light">{review.reviewerName}</span>
                    {review.verifiedPurchase && (
                      <span className="rounded bg-repixl-success/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-success">Verified Purchase</span>
                    )}
                  </div>
                </div>
                <span className="font-mono text-[10px] text-repixl-muted">{review.date}</span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/70">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </section>
  )
}

function ReviewForm({ slug, existing, onClose }: { slug: string; existing?: Review; onClose: () => void }) {
  const { firstName, lastName, userEmail } = useAuthStore()
  const addReview = useReviewStore((s) => s.addReview)
  const updateReview = useReviewStore((s) => s.updateReview)
  const orders = useOrderHistoryStore((s) => s.orders)
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [comment, setComment] = useState(existing?.comment ?? '')
  const [error, setError] = useState('')

  const isVerified = orders.some((o) => o.items.some((i) => i.slug === slug))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) { setError('Please select a star rating.'); return }
    if (!comment.trim()) { setError('Please write a comment.'); return }
    setError('')

    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    if (existing) {
      updateReview(existing.id, { rating, comment: comment.trim() })
    } else {
      addReview({
        productSlug: slug,
        reviewerName: `${firstName} ${lastName}`.trim(),
        reviewerEmail: userEmail,
        rating,
        comment: comment.trim(),
        date: now,
        verifiedPurchase: isVerified,
      })
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
      <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
        {existing ? 'Edit Your Review' : 'Write a Review'}
      </p>

      {/* Star selector */}
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i + 1)}
            aria-label={`Rate ${i + 1} star${i > 0 ? 's' : ''}`}
            className="transition-transform hover:scale-110"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={i < rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < rating ? 'text-repixl-warning' : 'text-repixl-muted/40'}>
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}
      </div>

      {/* Comment */}
      <div className="mt-3">
        <label htmlFor="review-comment" className="mb-1 block text-xs text-repixl-text-light/70">Your review</label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none"
          placeholder="Share your experience with this camera..."
        />
      </div>

      {error && <p className="mt-2 text-xs text-red-400" role="alert">{error}</p>}

      <div className="mt-3 flex items-center gap-3">
        <Button type="submit" variant="primary" size="sm">{existing ? 'Update Review' : 'Submit Review'}</Button>
        <button type="button" onClick={onClose} className="text-xs text-repixl-muted hover:text-repixl-text-light">Cancel</button>
      </div>
    </form>
  )
}
