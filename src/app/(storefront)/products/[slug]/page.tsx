'use client'

import { reportActionFailure } from '@/lib/action-error'
import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { Accordion, FeedbackState, InlineLoader, PageBackLink, Button, ConditionBadge, CornerBracket, LoginRequiredModal, ReviewImageThumbnails } from '@/components/ui'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
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
import { formatPrice } from '@/lib/format'
import { productService } from '@/lib/data/productService'
import { Pagination } from '@/components/product/catalog/Pagination'
import {
  aggregateRatings,
  formatAverage,
  roundedStars,
  ratingCountLabel,
  filterReviewsByRating,
  parseRatingFilter,
  REVIEWS_PAGE_SIZE,
  STAR_VALUES,
  type RatingFilter,
  type StarValue,
} from '@/lib/rating-aggregate'
import { paginate, clampPage } from '@/lib/catalog-filters'
import { RecentlyViewed } from '@/components/product/RecentlyViewed'
import { useRecentlyViewedStore } from '@/stores/recentlyViewedStore'

// Dynamically import the webcam-dependent component to avoid SSR issues
const CameraFilterDemo = dynamic(
  () => import('@/components/product/CameraFilterDemo').then((mod) => ({ default: mod.CameraFilterDemo })),
  { ssr: false }
)

function FilterDemoButton({ brand, model, slug }: { brand: string; model: string; slug: string }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const profile = getColorProfile(brand, slug)

  useEffect(() => { setMounted(true) }, [])
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

      {/* Portal modal — renders on document.body, never trapped by parent transforms */}
      {open && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Try the Look — camera color preview"
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Modal panel — sticky header/footer, scrollable body */}
          <div className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
            {/* Sticky header */}
            <div className="flex flex-shrink-0 items-center justify-between border-b border-repixl-muted/10 px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">Try the Look</h2>
                <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{profile.name}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close filter demo"
                className="flex h-11 w-11 items-center justify-center rounded-lg text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <CameraFilterDemo brand={brand} model={model} slug={slug} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

function MobilePurchaseBar({ disabled, label, onAdd }: { disabled: boolean; label: string; onAdd: () => void }) {
  return <div className="fixed inset-x-0 bottom-0 z-30 border-t border-repixl-muted/15 bg-repixl-charcoal/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_28px_rgba(0,0,0,0.35)] backdrop-blur-md lg:hidden"><Button variant="primary" size="lg" disabled={disabled} onClick={onAdd} className="w-full">{label}</Button></div>
}

export default function ProductDetailPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const { fadeUp, staggerContainer, staggerItem, fadeIn, viewport, reducedMotion } = useRevealAnimation()
  const allProducts = useProductStore((s) => s.products)
  const productsLoading = useProductStore((s) => s.loading)
  const productsError = useProductStore((s) => s.error)
  const product = allProducts.find((p) => p.slug === params.slug)
  const [catalogHydrated, setCatalogHydrated] = useState(false)

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
  // Real units sold, fetched from GET /api/products/[slug] (DELIVERED/COMPLETED
  // order-item quantities). null = not yet loaded → show nothing rather than 0.
  const [soldCount, setSoldCount] = useState<number | null>(null)
  const recordRecentlyViewed = useRecentlyViewedStore((s) => s.record)

  useEffect(() => {
    recordRecentlyViewed(params.slug)
  }, [params.slug, recordRecentlyViewed])

  useEffect(() => {
    const productLoad = useProductStore.getState().products.length > 0
      ? Promise.resolve()
      : useProductStore.getState().hydrate()
    void productLoad.finally(() => setCatalogHydrated(true))
    useCartStore.getState().hydrate()
    useWishlistStore.getState().hydrate()
    useCompareStore.getState().hydrate()
    useReviewStore.getState().hydrate()
    useOrderHistoryStore.getState().hydrate()
  }, [])

  // Fetch the real sold count for this product (single aggregate query server-
  // side). Kept separate from the catalog product store so list views stay lean.
  useEffect(() => {
    let active = true
    setSoldCount(null)
    productService
      .getBySlug(params.slug)
      .then((p) => {
        if (active) setSoldCount(typeof p.soldCount === 'number' ? p.soldCount : 0)
      })
      .catch(() => {
        // Leave as null on failure — the UI simply omits "N sold" rather than
        // showing a fabricated number.
        if (active) setSoldCount(null)
      })
    return () => {
      active = false
    }
  }, [params.slug])

  if (!catalogHydrated || (productsLoading && allProducts.length === 0)) {
    return <div className="min-h-screen bg-repixl-bg px-4 pt-24"><Container><FeedbackState kind="loading" title="Loading camera details" message="Preparing the camera archive…" /></Container></div>
  }

  if (productsError) {
    return <div className="min-h-screen bg-repixl-bg px-4 pt-24"><Container><FeedbackState kind="error" title="We couldn't load this camera" message="The camera details are temporarily unavailable. Please try again." action={<Button type="button" variant="primary" size="sm" onClick={() => { setCatalogHydrated(false); void useProductStore.getState().hydrate().finally(() => setCatalogHydrated(true)) }}>Try again</Button>} /></Container></div>
  }

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
        <div className="flex flex-col items-center text-center">
          <h1 className="font-display text-display-lg text-repixl-text-light">
            Camera not found
          </h1>
          <p className="mt-2 text-sm text-repixl-muted">
            The product you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <div className="mt-6">
            <PageBackLink label="All cameras" fallback="/products" />
          </div>
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

  const handleAddToCart = async () => {
    try {
      if (!isLoggedIn) {
        setLoginModalOpen(true)
        return
      }
      if (product && product.stock > 0 && cartQty < product.stock) {
        await addToCart(product.slug, selectedQty)
        addToast(`Added ${selectedQty} to cart: ${product.name}`, 'success', { label: 'View Cart', href: '/cart' }, 5000, product.image)
      }
    } catch {
      reportActionFailure()
    }
  }

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        {/* Canonical back-navigation region — returns to the actual previous page
            (e.g. the filtered catalog or search results), fallback to catalog. */}
        <PageBackLink fallback="/products" />

        {/* Breadcrumb */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mb-8 flex flex-wrap items-center justify-between gap-3"
        >
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              <li><Link href="/products" className="transition-colors hover:text-repixl-text-light">Cameras</Link></li>
              <li aria-hidden="true" className="text-repixl-muted/40">/</li>
              <li><Link href={`/products?brand=${product.brand.toLowerCase()}`} className="transition-colors hover:text-repixl-text-light">{product.brand}</Link></li>
              <li aria-hidden="true" className="text-repixl-muted/40">/</li>
              <li aria-current="page" className="max-w-[160px] truncate text-repixl-text-light/50">{product.name}</li>
            </ol>
          </nav>
        </motion.div>

        {/* Main product layout */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {/* Left: Image area */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="show"
          >
            <CornerBracket
              size={16}
              color="rgba(140, 133, 128, 0.3)"
              className="relative aspect-square overflow-hidden rounded-lg bg-repixl-charcoal p-6"
            >
              <div className="relative h-full w-full">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  priority
                  sizes="(min-width: 1024px) 45vw, 92vw"
                  className="object-contain transition-transform duration-500 hover:scale-105"
                />
              </div>
              <div className="absolute right-8 top-8">
                <ConditionBadge condition={product.condition} />
              </div>
            </CornerBracket>

            <div className="mt-5 flex justify-center">
              <FilterDemoButton brand={product.brand} model={product.name} slug={product.slug} />
            </div>
          </motion.div>

          {/* Right: Product info */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="flex flex-col lg:sticky lg:top-24 lg:self-start"
          >
            {/* Brand + series eyebrow */}
            <motion.span variants={staggerItem} className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              {product.brand} · {product.series}
            </motion.span>

            {/* Name */}
            <motion.h1 variants={staggerItem} className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
              {product.name}
            </motion.h1>

            {/* Price + condition + rating */}
            <motion.div variants={staggerItem} className="mt-4 flex flex-wrap items-center gap-4">
              <span className="font-display text-3xl font-bold text-repixl-text-light">
                {formatPrice(product.price)}
              </span>
              <ConditionBadge condition={product.condition} />
              <ProductRatingSummary slug={product.slug} soldCount={soldCount} />
            </motion.div>

            {/* Stock status */}
            <motion.div variants={staggerItem} className="mt-3 flex items-center gap-2">
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
            </motion.div>

            {/* Quantity + Actions */}
            <motion.div variants={staggerItem} className="mt-8 flex flex-wrap items-center gap-3">
              {product.stock > 0 && (
                <QuantitySelector value={selectedQty} max={product.stock} onChange={setSelectedQty} />
              )}
              <Button
                variant="primary"
                size="lg"
                disabled={product.stock === 0 || cartQty >= product.stock}
                className={product.stock === 0 || cartQty >= product.stock ? 'opacity-50 cursor-not-allowed' : ''}
                onClick={handleAddToCart}
              >
                {product.stock === 0 ? 'Out of Stock' : cartQty >= product.stock ? `Max in Cart (${cartQty})` : inCart ? `Add More (${cartQty} in cart)` : 'Add to Cart'}
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={async () => {
                  try {
                    if (!isLoggedIn) {
                      setLoginModalOpen(true)
                      return
                    }
                    if (product) {
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
                    }
                  } catch {
                    reportActionFailure()
                  }
                }}
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill={inWishlist ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                  </svg>
                  {inWishlist ? 'In Wishlist' : 'Wishlist'}
                </span>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  if (!product) return
                  if (inCompare) { router.push('/compare'); return }
                  const result = addToCompare(product.slug)
                  if (result === 'added') setCompareModal('added')
                  else if (result === 'already') router.push('/compare')
                  else setCompareModal('full')
                }}
              >
                <span className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M12 3v18" /></svg>
                  {inCompare ? 'View Comparison' : '+ Compare'}
                </span>
              </Button>
            </motion.div>

            <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />

            {/* Compare confirmation modal — portaled to escape Framer Motion stacking context */}
            {compareModal && createPortal(
              <div
                role="dialog"
                aria-modal="true"
                aria-label="Compare action"
                className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
              >
                <div className="w-full max-w-sm rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
                  {compareModal === 'added' ? (
                    <>
                      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-success/15">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                      </div>
                      <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Added to Compare</h3>
                      <p className="mt-1 text-center text-sm text-repixl-muted">{product.name} has been added. Compare now or keep browsing?</p>
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
                      <p className="mt-1 text-center text-sm text-repixl-muted">Remove one camera to add {product.name}.</p>
                      <div className="mt-5 flex flex-col gap-2">
                        <button onClick={() => { setCompareModal(null); router.push('/compare') }} className="w-full rounded-lg bg-repixl-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700">Manage Compare List</button>
                        <button onClick={() => setCompareModal(null)} className="w-full rounded-lg border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-muted/5 hover:text-repixl-text-light">Close</button>
                      </div>
                    </>
                  )}
                </div>
              </div>,
              document.body
            )}
            {toast && <CompareToast message={toast.message} type={toast.type} visible={!!toast} onDismiss={() => setToast(null)} />}

            {/* Description + Accordion info sections */}
            <motion.div variants={staggerItem} className="mt-8 border-t border-repixl-muted/10 pt-8">
              <Accordion
                items={[
                  {
                    id: 'about',
                    label: 'About this camera',
                    defaultOpen: true,
                    children: (
                      <p className="text-sm leading-relaxed text-repixl-text-light/75">{product.description}</p>
                    ),
                  },
                  {
                    id: 'specs',
                    label: 'Specifications',
                    defaultOpen: true,
                    children: (
                      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                        {[
                          { label: 'Resolution', value: `${product.specs.megapixels} MP` },
                          { label: 'Zoom', value: product.specs.zoom },
                          { label: 'Storage', value: product.specs.storage },
                          { label: 'Year', value: String(product.specs.year) },
                          { label: 'Brand', value: product.brand },
                          { label: 'Series', value: product.series },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <dt className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">{label}</dt>
                            <dd className="mt-0.5 font-mono text-sm text-repixl-text-light">{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ),
                  },
                  {
                    id: 'condition',
                    label: 'Condition Details',
                    children: (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ConditionBadge condition={product.condition} />
                          <span className="text-sm text-repixl-text-light/70">
                            {product.condition === 'mint' && 'Like-new. No visible wear, fully tested, all functions perfect.'}
                            {product.condition === 'excellent' && 'Minimal signs of use. Light cosmetic marks only — fully functional.'}
                            {product.condition === 'good' && 'Normal wear from regular use. Minor scuffs — core functions working.'}
                            {product.condition === 'fair' && 'Visible wear or cosmetic damage. Fully functional but shows history.'}
                          </span>
                        </div>
                      </div>
                    ),
                  },
                  {
                    id: 'authenticity',
                    label: 'Authenticity & Verification',
                    children: (
                      <div className="flex items-start gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0 text-repixl-success" aria-hidden="true">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>
                        </svg>
                        <p className="text-sm text-repixl-text-light/70">
                          Serial number verified. Multi-angle photos on file. Every camera is physically inspected and graded by our team before listing. We stand behind every grade.
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: 'shipping',
                    label: 'Shipping & Returns',
                    children: (
                      <div className="space-y-2 text-sm text-repixl-text-light/70">
                        <p>Ships within 1–2 business days of order confirmation.</p>
                        <p>Shipping options and rates are calculated at checkout.</p>
                        <p className="flex items-center gap-1.5">
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-success flex-shrink-0" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          14-day return window. Item must be in original condition.
                        </p>
                      </div>
                    ),
                  },
                ]}
              />
            </motion.div>
          </motion.div>
        </div>

        {/* Reviews section */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
        >
          <Suspense fallback={<div className="mt-16 border-t border-repixl-muted/10 pt-12"><p className="text-sm text-repixl-muted">Loading reviews…</p></div>}>
            <ProductReviews slug={product.slug} />
          </Suspense>
        </motion.div>

        {/* Related products */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={viewport}
          className="mt-20 border-t border-repixl-muted/10 pt-12"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— You might also like</span>
          <h2 className="mt-2 font-display text-display-sm text-repixl-text-light md:text-display-md">
            Related Cameras
          </h2>
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={viewport}
            className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            {related.map((p) => (
              <motion.div key={p.slug} variants={staggerItem}>
                <ProductCard product={p} />
              </motion.div>
            ))}
          </motion.div>
        </motion.section>
        <RecentlyViewed compact />
      </Container>
      <Footer />
      <MobilePurchaseBar disabled={product.stock === 0 || cartQty >= product.stock} label={product.stock === 0 ? 'Out of Stock' : cartQty >= product.stock ? `Max in Cart (${cartQty})` : 'Add to Cart'} onAdd={handleAddToCart} />
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
  const filled = roundedStars(rating)
  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <svg key={i} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill={i < filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < filled ? 'text-repixl-warning' : 'text-repixl-muted/40'}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

/**
 * Rating summary beside the product info:
 *   4.9  ★★★★★  (128 ratings)  ·  342 sold
 * Uses the centralized `aggregateRatings` so this matches the ProductCard, the
 * catalog, and the Compare page exactly. Unrated → "No ratings yet". `soldCount`
 * (real, from the API) is shown when known and > 0, independent of ratings.
 */
function ProductRatingSummary({ slug, soldCount }: { slug: string; soldCount: number | null }) {
  const reviews = useReviewStore((s) => s.reviews)
  const summary = aggregateRatings(reviews.filter((r) => r.productSlug === slug))
  const avgLabel = formatAverage(summary)

  const soldNode =
    soldCount != null && soldCount > 0 ? (
      <>
        <span aria-hidden="true" className="text-repixl-muted/50">·</span>
        <span className="text-sm text-repixl-text-light/80">
          <span className="font-semibold text-repixl-text-light">{soldCount.toLocaleString()}</span> sold
        </span>
      </>
    ) : null

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      {avgLabel ? (
        <span className="flex items-center gap-1.5" aria-label={`Rated ${avgLabel} out of 5 stars from ${summary.count} ${summary.count === 1 ? 'rating' : 'ratings'}`}>
          <span className="font-display text-sm font-semibold text-repixl-text-light">{avgLabel}</span>
          <StarDisplay rating={summary.average} size={13} />
          <span className="text-sm text-repixl-muted">({ratingCountLabel(summary.count)})</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <StarDisplay rating={0} size={13} />
          <span className="text-sm text-repixl-muted">No ratings yet</span>
        </span>
      )}
      {soldNode}
    </div>
  )
}

interface PdpReview {
  id: string
  reviewerName: string
  rating: number
  comment: string
  createdAt: string
  verifiedPurchase: boolean
  images: { id: string; secureUrl: string }[]
}

/**
 * Customer Reviews section.
 *
 * Data: fetches ALL of this product's reviews once (large limit), then derives
 * the summary, per-star distribution, star filter, and pagination entirely on
 * the client via the centralized `aggregateRatings` + `filterReviewsByRating` +
 * `paginate`. Pipeline order is ALL → FILTER → PAGINATE, so the page numbers
 * always reflect the selected star.
 *
 * URL state: the selected star (`?rating=`) and review page (`?reviewPage=`) are
 * mirrored in the query string with `history.replaceState` so they don't add
 * history entries or disturb existing product params. Changing the star filter
 * resets the page to 1.
 */
function ProductReviews({ slug }: { slug: string }) {
  const searchParams = useSearchParams()
  const [reviews, setReviews] = useState<PdpReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const [ratingFilter, setRatingFilter] = useState<RatingFilter>(() => parseRatingFilter(searchParams.get('rating')))
  const [page, setPage] = useState<number>(() => {
    const n = Number(searchParams.get('reviewPage') ?? '1')
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1
  })
  const headingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)
    // Fetch the full set so distribution + filtered pagination are accurate.
    fetch(`/api/reviews?productSlug=${encodeURIComponent(slug)}&limit=1000`)
      .then((r) => { if (!r.ok) throw new Error('Reviews unavailable'); return r.json() })
      .then((json) => {
        if (!active) return
        setReviews((json.data ?? []) as PdpReview[])
        setLoading(false)
      })
      .catch(() => {
        if (active) { setLoading(false); setError(true) }
      })
    return () => {
      active = false
    }
  }, [slug])

  // Reflect rating + page in the URL without touching other params or history.
  const writeUrl = (nextRating: RatingFilter, nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (nextRating === null) params.delete('rating')
    else params.set('rating', String(nextRating))
    if (nextPage <= 1) params.delete('reviewPage')
    else params.set('reviewPage', String(nextPage))
    const qs = params.toString()
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    }
  }

  const summary = aggregateRatings(reviews)
  const avgLabel = formatAverage(summary)

  // ALL → FILTER → PAGINATE
  const filtered = filterReviewsByRating(reviews, ratingFilter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / REVIEWS_PAGE_SIZE))
  const safePage = clampPage(page, totalPages)
  const pageData = paginate(filtered, safePage, REVIEWS_PAGE_SIZE)

  const selectRating = (next: RatingFilter) => {
    setRatingFilter(next)
    setPage(1) // changing the filter always resets to page 1
    writeUrl(next, 1)
  }

  const goToPage = (next: number) => {
    const clamped = clampPage(next, totalPages)
    setPage(clamped)
    writeUrl(ratingFilter, clamped)
    headingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const maxBar = Math.max(1, ...STAR_VALUES.map((s) => summary.distribution[s]))

  return (
    <section className="mt-16 border-t border-repixl-muted/10 pt-12" aria-labelledby="reviews-heading">
      <div ref={headingRef} className="scroll-mt-28">
        <h2 id="reviews-heading" className="font-mono text-[11px] uppercase tracking-[0.3em] text-repixl-muted">
          Customer Reviews
        </h2>
      </div>

      {loading && <InlineLoader label="Loading reviews…" className="justify-start py-8" />}

      {!loading && error && (
        <FeedbackState
          kind="error"
          className="mt-8"
          title="We couldn't load reviews"
          message="Please try again to view customer experiences for this camera."
          action={<Button type="button" variant="secondary" size="sm" onClick={() => { setError(false); setLoading(true); fetch(`/api/reviews?productSlug=${encodeURIComponent(slug)}&limit=1000`).then((r) => { if (!r.ok) throw new Error('Reviews unavailable'); return r.json() }).then((json) => { setReviews((json.data ?? []) as PdpReview[]); setLoading(false) }).catch(() => { setLoading(false); setError(true) }) }}>Try again</Button>}
        />
      )}

      {/* Empty: product has no reviews at all */}
      {!loading && !error && summary.count === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-repixl-muted/20 px-6 py-14 text-center">
          <StarDisplay rating={0} size={20} />
          <p className="mt-4 font-display text-display-sm text-repixl-text-light/70">No ratings yet</p>
          <p className="mt-1.5 text-sm text-repixl-muted">Be the first to share your experience with this camera.</p>
        </div>
      )}

      {!loading && !error && summary.count > 0 && (
        <>
          {/* Summary + distribution + filters. Desktop: summary | distribution.
              Mobile: stacks cleanly. */}
          <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,220px)_1fr] md:items-start">
            {/* Prominent average */}
            <div className="flex flex-col items-center rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal/50 px-6 py-7 text-center">
              <p className="font-display text-5xl font-bold leading-none text-repixl-text-light">
                {avgLabel}
                <span className="text-2xl text-repixl-muted/70"> / 5</span>
              </p>
              <div className="mt-3">
                <StarDisplay rating={summary.average} size={18} />
              </div>
              <p className="mt-2 text-sm text-repixl-muted">{ratingCountLabel(summary.count)}</p>
            </div>

            {/* Restrained distribution bars */}
            <div>
              <ul className="space-y-2" aria-label="Rating distribution">
                {STAR_VALUES.map((star) => {
                  const n = summary.distribution[star]
                  const pct = Math.round((n / maxBar) * 100)
                  return (
                    <li key={star} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 font-mono text-xs text-repixl-muted">{star} ★</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-repixl-muted/10" aria-hidden="true">
                        <div className="h-full rounded-full bg-repixl-warning/80 transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-repixl-muted">{n}</span>
                    </li>
                  )
                })}
              </ul>

              {/* Segmented star filter — real counts */}
              <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Filter reviews by star rating">
                <FilterPill
                  label={`All (${summary.count})`}
                  selected={ratingFilter === null}
                  onClick={() => selectRating(null)}
                />
                {STAR_VALUES.map((star) => (
                  <FilterPill
                    key={star}
                    label={`${star} Star (${summary.distribution[star]})`}
                    selected={ratingFilter === star}
                    onClick={() => selectRating(star)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Review list (filtered + paginated) */}
          <div className="mt-10">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-repixl-muted/20 px-6 py-12 text-center">
                <p className="text-sm text-repixl-text-light/80">
                  No {ratingFilter}-star reviews for this camera.
                </p>
                <button
                  type="button"
                  onClick={() => selectRating(null)}
                  className="mt-3 font-mono text-[11px] uppercase tracking-wider text-repixl-red underline-offset-2 transition-colors hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                >
                  Back to all reviews
                </button>
              </div>
            ) : (
              <>
                <p className="sr-only" role="status">
                  Showing page {pageData.page} of {pageData.totalPages}, {filtered.length} matching {filtered.length === 1 ? 'review' : 'reviews'}
                </p>
                <ul className="space-y-4">
                  {pageData.items.map((review) => (
                    <li key={review.id} className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <StarDisplay rating={review.rating} size={13} />
                            <span className="font-mono text-xs text-repixl-text-light/80" aria-label={`${review.rating} out of 5 stars`}>
                              {review.rating.toFixed(1)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="text-sm font-medium text-repixl-text-light">{review.reviewerName}</span>
                            {review.verifiedPurchase && (
                              <span className="rounded bg-repixl-success/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-success">
                                Verified Purchase
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-[10px] text-repixl-muted">
                          {new Date(review.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-repixl-text-light/70">{review.comment}</p>
                      {review.images && review.images.length > 0 && (
                        <ReviewImageThumbnails
                          images={review.images.map((img, i) => ({ src: img.secureUrl, alt: `Review photo ${i + 1}` }))}
                        />
                      )}
                    </li>
                  ))}
                </ul>

                <Pagination page={pageData.page} totalPages={pageData.totalPages} onPageChange={goToPage} />
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}

/** Modern segmented filter pill for the rating filter. */
function FilterPill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={[
        'rounded-full border px-3.5 py-1.5 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
        selected
          ? 'border-repixl-red bg-repixl-red/10 font-semibold text-repixl-text-light'
          : 'border-repixl-muted/25 text-repixl-text-light/80 hover:border-repixl-muted/45 hover:text-repixl-text-light',
      ].join(' ')}
    >
      {label}
    </button>
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

  const handleSubmit = async (e: React.FormEvent) => {
    try {
      e.preventDefault()
      if (rating === 0) {
        setError('Please select a star rating.')
        return
      }
      if (!comment.trim()) {
        setError('Please write a comment.')
        return
      }
      setError('')

      const now = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })

      if (existing) {
        await updateReview(existing.id, { rating, comment: comment.trim() })
      } else {
        await addReview({
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
    } catch {
      reportActionFailure()
    }
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
