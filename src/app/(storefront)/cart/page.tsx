'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge, LoginRequiredModal } from '@/components/ui'
import { Footer } from '@/components/layout/Footer'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useVoucherStore } from '@/stores/voucherStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'

export default function CartPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')

  const { fadeUp, staggerContainer, staggerItem, viewport, reducedMotion } = useRevealAnimation()

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const cartItems = useCartStore((s) => s.items)
  const removeFromCart = useCartStore((s) => s.removeFromCart)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const allProducts = useProductStore((s) => s.products)
  const validateCode = useVoucherStore((s) => s.validateCode)
  const useVoucher = useVoucherStore((s) => s.useVoucher)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      await useAuthStore.getState().hydrate()
      await useCartStore.getState().hydrate()
      useProductStore.getState().hydrate()
      useVoucherStore.getState().hydrate()
    }
    void init()
  }, [])

  const resolvedItems = cartItems.map((item) => {
    const product = allProducts.find((p) => p.slug === item.slug)
    return product ? { product, quantity: item.quantity } : null
  }).filter(Boolean) as { product: typeof allProducts[0]; quantity: number }[]

  const SHIPPING_COST = 12
  const subtotal = resolvedItems.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0)
  const discount = promoDiscount
  const total = subtotal + SHIPPING_COST - discount
  const totalQty = resolvedItems.reduce((s, i) => s + i.quantity, 0)

  const handleCheckout = () => {
    if (!isLoggedIn) setLoginModalOpen(true)
    else router.push('/checkout')
  }

  const handlePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    setPromoError('')
    if (!promoCode.trim()) return
    const result = await validateCode(promoCode, subtotal)
    if (!result.valid) { setPromoError(result.error || 'Invalid code.'); return }
    setPromoDiscount(result.discount)
    setPromoApplied(true)
    useVoucher(promoCode.toUpperCase().trim())
  }

  // ── Empty state ──
  if (resolvedItems.length === 0) {
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
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h1 className="mt-6 font-display text-display-md text-repixl-text-light">Your cart is empty</h1>
            <p className="mt-2 text-sm text-repixl-muted">You haven&apos;t added any cameras yet.</p>
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
            className="mb-8 border-b border-repixl-muted/10 pb-6"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Your selection
            </span>
            <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">
              Cart
            </h1>
            <p className="mt-1 text-sm text-repixl-muted">
              {totalQty} {totalQty === 1 ? 'item' : 'items'}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Items list */}
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              className="space-y-3 lg:col-span-2"
            >
              <AnimatePresence>
                {resolvedItems.map(({ product, quantity }) => (
                  <motion.div
                    key={product.slug}
                    variants={staggerItem}
                    exit={reducedMotion ? { opacity: 1 } : { opacity: 0, height: 0, marginBottom: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.3 }}
                    className="flex gap-4 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4 transition-colors hover:border-repixl-muted/20"
                  >
                    <Link href={`/products/${product.slug}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-repixl-bg p-1 transition-opacity hover:opacity-80">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                    </Link>
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link href={`/products/${product.slug}`} className="text-sm font-medium text-repixl-text-light transition-colors hover:text-repixl-text-light/80">
                              {product.name}
                            </Link>
                            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                              {product.brand} · {product.series}
                            </p>
                          </div>
                          <span className="font-display text-lg font-semibold text-repixl-text-light">
                            ${product.price * quantity}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <ConditionBadge condition={product.condition} />
                          <span className="font-mono text-[10px] text-repixl-muted">${product.price} each</span>
                          {product.stock > 0 && product.stock <= 3 && (
                            <span className="font-mono text-[10px] text-repixl-warning">Only {product.stock} left</span>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-4">
                        {/* Quantity control */}
                        <div className="flex items-center rounded border border-repixl-muted/20">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.slug, quantity - 1)}
                            disabled={quantity <= 1}
                            aria-label="Decrease quantity"
                            className="flex h-8 w-8 items-center justify-center text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30"
                          >
                            −
                          </button>
                          <span className="flex h-8 w-9 items-center justify-center border-x border-repixl-muted/20 font-mono text-xs text-repixl-text-light">
                            {quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.slug, quantity + 1)}
                            disabled={quantity >= product.stock}
                            aria-label="Increase quantity"
                            className="flex h-8 w-8 items-center justify-center text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(product.slug)}
                          className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-red"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              <motion.div variants={staggerItem}>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                  Continue shopping
                </Link>
              </motion.div>
            </motion.div>

            {/* Order summary sidebar */}
            <motion.aside
              variants={fadeUp}
              initial="hidden"
              animate="show"
              transition={{ delay: reducedMotion ? 0 : 0.2 }}
              className="lg:col-span-1"
            >
              <div className="sticky top-24 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                  Order Summary
                </p>
                <dl className="mt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-text-light/70">Subtotal</dt>
                    <dd className="font-mono text-repixl-text-light">${subtotal}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-text-light/70">Shipping (est.)</dt>
                    <dd className="font-mono text-repixl-text-light">${SHIPPING_COST}</dd>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between text-sm">
                      <dt className="text-repixl-success">Discount</dt>
                      <dd className="font-mono text-repixl-success">−${discount}</dd>
                    </div>
                  )}
                  <div className="border-t border-repixl-muted/10 pt-3">
                    <div className="flex justify-between">
                      <dt className="text-sm font-medium text-repixl-text-light">Total</dt>
                      <dd className="font-display text-xl font-bold text-repixl-text-light">${total}</dd>
                    </div>
                  </div>
                </dl>

                {/* Voucher field */}
                {!promoApplied && (
                  <form onSubmit={handlePromo} className="mt-5">
                    <label htmlFor="promo-code" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                      Voucher code
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="promo-code"
                        type="text"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Enter code"
                        className="flex-1 rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="rounded border border-repixl-muted/20 px-3 py-2 font-mono text-xs font-medium text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light"
                      >
                        Apply
                      </button>
                    </div>
                    {promoError && <p className="mt-1.5 text-xs text-red-400">{promoError}</p>}
                  </form>
                )}
                {promoApplied && (
                  <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] text-repixl-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    Voucher applied — ${discount} off
                  </p>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={handleCheckout}
                >
                  Proceed to Checkout
                </Button>

                {/* Trust note */}
                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/60" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <span className="font-mono text-[10px] text-repixl-muted/60">Secure checkout · 14-day returns</span>
                </div>
              </div>
            </motion.aside>
          </div>
          <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        </Container>
      </div>
      <Footer />
    </>
  )
}
