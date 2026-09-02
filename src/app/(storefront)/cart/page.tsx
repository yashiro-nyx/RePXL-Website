'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
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
  const [clearModalOpen, setClearModalOpen] = useState(false)
  // ── Selection state ──
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set())
  // ── Checkout confirmation modal ──
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false)

  const { fadeUp, staggerContainer, staggerItem, viewport, reducedMotion } = useRevealAnimation()

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const cartItems = useCartStore((s) => s.items)
  const removeFromCart = useCartStore((s) => s.removeFromCart)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const clearCart = useCartStore((s) => s.clearCart)
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
    return product ? { product: { ...product, stock: Math.max(0, product.stock) }, quantity: item.quantity } : null
  }).filter(Boolean) as { product: typeof allProducts[0]; quantity: number }[]

  // ── Auto-select all newly resolved items ──
  useEffect(() => {
    if (resolvedItems.length === 0) return
    setSelectedSlugs((prev) => {
      const next = new Set(prev)
      resolvedItems.forEach(({ product }) => {
        if (!next.has(product.slug)) next.add(product.slug)
      })
      // Remove slugs no longer in cart
      for (const slug of Array.from(next)) {
        if (!resolvedItems.find((i) => i.product.slug === slug)) next.delete(slug)
      }
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length])

  const selectedItems = resolvedItems.filter(({ product }) => selectedSlugs.has(product.slug))
  const allSelected = resolvedItems.length > 0 && selectedItems.length === resolvedItems.length
  const noneSelected = selectedItems.length === 0

  const toggleAll = () => {
    if (allSelected) setSelectedSlugs(new Set())
    else setSelectedSlugs(new Set(resolvedItems.map(({ product }) => product.slug)))
  }

  const toggleItem = (slug: string) => {
    setSelectedSlugs((prev) => {
      const next = new Set(prev)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })
  }

  const SHIPPING_COST = 12
  const subtotal = selectedItems.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0)
  const fullSubtotal = resolvedItems.reduce((sum, { product, quantity }) => sum + product.price * quantity, 0)
  const discount = promoApplied ? promoDiscount : 0
  const total = subtotal + SHIPPING_COST - discount
  const totalQty = resolvedItems.reduce((s, i) => s + i.quantity, 0)
  const selectedQty = selectedItems.reduce((s, i) => s + i.quantity, 0)

  const handleCheckoutClick = () => {
    if (!isLoggedIn) { setLoginModalOpen(true); return }
    if (noneSelected) return
    setCheckoutModalOpen(true)
  }

  const handleConfirmCheckout = () => {
    setCheckoutModalOpen(false)
    // Pass selected slugs to checkout via sessionStorage so checkout knows
    // which items to process. Checkout reads this and ignores non-selected.
    sessionStorage.setItem(
      'repixl-checkout-selected',
      JSON.stringify(Array.from(selectedSlugs))
    )
    router.push('/checkout')
  }

  const handlePromo = async (e: React.FormEvent) => {
    e.preventDefault()
    setPromoError('')
    if (!promoCode.trim()) return
    const result = await validateCode(promoCode, fullSubtotal)
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
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="mb-8 border-b border-repixl-muted/10 pb-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Your selection</span>
                <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">Cart</h1>
                <p className="mt-1 text-sm text-repixl-muted">
                  {totalQty} {totalQty === 1 ? 'item' : 'items'}
                  {selectedQty !== totalQty && ` · ${selectedQty} selected`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setClearModalOpen(true)}
                className="mb-1 flex items-center gap-1.5 rounded-lg border border-repixl-muted/20 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:border-repixl-red/40 hover:text-repixl-red"
                aria-label="Clear all items from cart"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                </svg>
                Clear Cart
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Items list */}
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3 lg:col-span-2">

              {/* Select-all row */}
              <motion.div variants={staggerItem} className="flex items-center gap-3 px-1 pb-1">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={allSelected}
                  onClick={toggleAll}
                  className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 ${
                    allSelected ? 'border-repixl-red bg-repixl-red' : 'border-repixl-muted/40 bg-repixl-bg'
                  }`}
                >
                  {allSelected && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  )}
                </button>
                <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                  {allSelected ? 'Deselect all' : 'Select all'}
                </span>
              </motion.div>

              <AnimatePresence>
                {resolvedItems.map(({ product, quantity }) => {
                  const isSelected = selectedSlugs.has(product.slug)
                  return (
                    <motion.div
                      key={product.slug}
                      variants={staggerItem}
                      exit={reducedMotion ? { opacity: 1 } : { opacity: 0, height: 0, marginBottom: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.3 }}
                      className={`flex gap-3 rounded-lg border bg-repixl-charcoal p-4 transition-colors hover:border-repixl-muted/20 ${
                        isSelected ? 'border-repixl-red/30' : 'border-repixl-muted/10'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="flex flex-shrink-0 items-start pt-1">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={isSelected}
                          aria-label={`${isSelected ? 'Deselect' : 'Select'} ${product.name}`}
                          onClick={() => toggleItem(product.slug)}
                          className={`flex h-4 w-4 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 ${
                            isSelected ? 'border-repixl-red bg-repixl-red' : 'border-repixl-muted/40 bg-repixl-bg'
                          }`}
                        >
                          {isSelected && (
                            <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                          )}
                        </button>
                      </div>

                      {/* Product image */}
                      <Link href={`/products/${product.slug}`} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-repixl-bg p-1 transition-opacity hover:opacity-80">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                      </Link>

                      {/* Details */}
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
                          {/* Quantity */}
                          <div className="flex items-center rounded border border-repixl-muted/20">
                            <button type="button" onClick={() => updateQuantity(product.slug, quantity - 1)} disabled={quantity <= 1}
                              aria-label="Decrease quantity"
                              className="flex h-8 w-8 items-center justify-center text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30">−</button>
                            <span className="flex h-8 w-9 items-center justify-center border-x border-repixl-muted/20 font-mono text-xs text-repixl-text-light">{quantity}</span>
                            <button type="button" onClick={() => updateQuantity(product.slug, quantity + 1)} disabled={quantity >= product.stock}
                              aria-label="Increase quantity"
                              className="flex h-8 w-8 items-center justify-center text-sm text-repixl-text-light/70 transition-colors hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30">+</button>
                          </div>
                          <button type="button" onClick={() => removeFromCart(product.slug)}
                            className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-red">
                            Remove
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              <motion.div variants={staggerItem}>
                <Link href="/products" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
                  Continue shopping
                </Link>
              </motion.div>
            </motion.div>

            {/* Order summary sidebar */}
            <motion.aside variants={fadeUp} initial="hidden" animate="show" transition={{ delay: reducedMotion ? 0 : 0.2 }} className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
                <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Summary</p>
                {selectedItems.length < resolvedItems.length && selectedItems.length > 0 && (
                  <p className="mt-1 font-mono text-[9px] text-repixl-warning">
                    {selectedItems.length} of {resolvedItems.length} items selected
                  </p>
                )}
                <dl className="mt-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-text-light/70">Subtotal ({selectedQty} {selectedQty === 1 ? 'item' : 'items'})</dt>
                    <dd className="font-mono text-repixl-text-light">${subtotal.toFixed(2)}</dd>
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
                      <dd className="font-display text-xl font-bold text-repixl-text-light">${total.toFixed(2)}</dd>
                    </div>
                  </div>
                </dl>

                {/* Voucher */}
                {!promoApplied ? (
                  <form onSubmit={handlePromo} className="mt-5">
                    <label htmlFor="promo-code" className="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-repixl-muted">Voucher code</label>
                    <div className="flex gap-2">
                      <input id="promo-code" type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Enter code"
                        className="flex-1 rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none" />
                      <button type="submit" className="rounded border border-repixl-muted/20 px-3 py-2 font-mono text-xs font-medium text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light">Apply</button>
                    </div>
                    {promoError && <p className="mt-1.5 text-xs text-red-400">{promoError}</p>}
                  </form>
                ) : (
                  <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] text-repixl-success">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                    Voucher applied — ${discount} off
                  </p>
                )}

                <Button variant="primary" size="lg" className="mt-6 w-full" onClick={handleCheckoutClick} disabled={noneSelected}>
                  {noneSelected ? 'Select items to check out' : `Proceed to Checkout (${selectedQty})`}
                </Button>

                {noneSelected && (
                  <p className="mt-2 text-center font-mono text-[10px] text-repixl-muted/60">Select at least one item above</p>
                )}

                <div className="mt-4 flex items-center justify-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/60" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  <span className="font-mono text-[10px] text-repixl-muted/60">Secure checkout · 14-day returns</span>
                </div>
              </div>
            </motion.aside>
          </div>
          <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
        </Container>
      </div>
      <Footer />

      {/* Clear Cart confirmation modal */}
      {clearModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-red/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
                <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Clear Cart?</h3>
            <p className="mt-2 text-center text-sm text-repixl-muted">
              Remove all {totalQty} {totalQty === 1 ? 'item' : 'items'} from your cart? This cannot be undone.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <button type="button" onClick={() => setClearModalOpen(false)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light">
                Cancel
              </button>
              <button type="button" onClick={() => { void clearCart(); setClearModalOpen(false) }}
                className="flex-1 rounded-xl bg-repixl-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                Clear Cart
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Checkout confirmation modal */}
      {checkoutModalOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm rounded-xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-repixl-red/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-red" aria-hidden="true">
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h3 className="text-center font-display text-lg font-semibold text-repixl-text-light">Proceed to Checkout?</h3>
            <p className="mt-1 text-center text-sm text-repixl-muted">
              You&apos;re checking out{' '}
              <span className="font-semibold text-repixl-text-light">{selectedQty} {selectedQty === 1 ? 'item' : 'items'}</span>
              {selectedItems.length < resolvedItems.length && (
                <span className="text-repixl-muted"> ({resolvedItems.length - selectedItems.length} will remain in cart)</span>
              )}
            </p>
            {/* Selected items summary */}
            <ul className="mt-4 space-y-1.5 rounded-lg border border-repixl-muted/10 bg-repixl-bg/40 px-4 py-3">
              {selectedItems.map(({ product, quantity }) => (
                <li key={product.slug} className="flex items-center justify-between">
                  <span className="truncate text-xs text-repixl-text-light/80">{product.name}{quantity > 1 ? ` ×${quantity}` : ''}</span>
                  <span className="ml-3 flex-shrink-0 font-mono text-xs text-repixl-text-light">${(product.price * quantity).toFixed(2)}</span>
                </li>
              ))}
            </ul>
            {/* Total */}
            <div className="mt-3 flex items-center justify-between border-t border-repixl-muted/10 pt-3">
              <span className="text-sm font-medium text-repixl-text-light">Total (incl. shipping)</span>
              <span className="font-display text-lg font-bold text-repixl-text-light">${total.toFixed(2)}</span>
            </div>
            {/* Actions */}
            <div className="mt-5 flex items-center gap-3">
              <button type="button" onClick={() => setCheckoutModalOpen(false)}
                className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2.5 text-sm text-repixl-text-light/70 transition-colors hover:bg-repixl-bg hover:text-repixl-text-light">
                Keep Shopping
              </button>
              <button type="button" onClick={handleConfirmCheckout}
                className="flex-1 rounded-xl bg-repixl-red px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                Confirm & Checkout
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  )
}
