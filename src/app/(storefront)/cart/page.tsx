'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge, LoginRequiredModal } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useVoucherStore } from '@/stores/voucherStore'

export default function CartPage() {
  const [loginModalOpen, setLoginModalOpen] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(false)
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')

  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const cartItems = useCartStore((s) => s.items)
  const removeFromCart = useCartStore((s) => s.removeFromCart)
  const updateQuantity = useCartStore((s) => s.updateQuantity)
  const allProducts = useProductStore((s) => s.products)
  const validateCode = useVoucherStore((s) => s.validateCode)
  const useVoucher = useVoucherStore((s) => s.useVoucher)
  const router = useRouter()

  useEffect(() => {
    useAuthStore.getState().hydrate()
    useCartStore.getState().hydrate()
    useProductStore.getState().hydrate()
    useVoucherStore.getState().hydrate()
  }, [])

  // Resolve cart items to live product data
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

  const handlePromo = (e: React.FormEvent) => {
    e.preventDefault()
    setPromoError('')
    if (!promoCode.trim()) return
    const result = validateCode(promoCode, subtotal)
    if (!result.valid) {
      setPromoError(result.error || 'Invalid code.')
      return
    }
    setPromoDiscount(result.discount)
    setPromoApplied(true)
    useVoucher(promoCode.toUpperCase().trim())
  }

  if (resolvedItems.length === 0) {
    return (
      <div className="min-h-screen bg-repixl-bg pb-16 pt-24">
        <Container>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" /></svg>
            <h1 className="mt-6 font-display text-display-md text-repixl-text-light">Your cart is empty</h1>
            <p className="mt-2 text-sm text-repixl-muted">Looks like you haven&apos;t added any cameras yet.</p>
            <Link href="/products" className="mt-6"><Button variant="primary" size="lg">Browse Cameras</Button></Link>
          </div>
        </Container>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-repixl-bg pb-16 pt-24">
      <Container>
        <h1 className="font-display text-display-md text-repixl-text-light md:text-display-lg">Your Cart</h1>
        <p className="mt-1 text-sm text-repixl-muted">{totalQty} {totalQty === 1 ? 'item' : 'items'}</p>

        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {resolvedItems.map(({ product, quantity }) => (
              <div key={product.slug} className="flex gap-4 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4">
                <Link href={`/products/${product.slug}`} className="h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-repixl-bg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.image} alt={product.name} className="h-full w-full object-contain" />
                </Link>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link href={`/products/${product.slug}`} className="text-sm font-medium text-repixl-text-light hover:underline">{product.name}</Link>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">{product.brand} · {product.series}</p>
                      </div>
                      <span className="font-display text-lg font-semibold text-repixl-text-light">${product.price * quantity}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <ConditionBadge condition={product.condition} />
                      <span className="font-mono text-[10px] text-repixl-muted">${product.price} each · {product.stock} available</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center rounded border border-repixl-muted/20">
                      <button type="button" onClick={() => updateQuantity(product.slug, quantity - 1)} disabled={quantity <= 1} aria-label="Decrease quantity" className="flex h-8 w-7 items-center justify-center text-xs text-repixl-text-light/70 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30">−</button>
                      <span className="flex h-8 w-8 items-center justify-center border-x border-repixl-muted/20 font-mono text-xs text-repixl-text-light">{quantity}</span>
                      <button type="button" onClick={() => updateQuantity(product.slug, quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity" className="flex h-8 w-7 items-center justify-center text-xs text-repixl-text-light/70 hover:text-repixl-text-light disabled:cursor-not-allowed disabled:text-repixl-muted/30">+</button>
                    </div>
                    <button type="button" onClick={() => removeFromCart(product.slug)} className="text-xs text-repixl-muted hover:text-repixl-red">Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
              <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Summary</h2>
              <dl className="mt-5 space-y-3">
                <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/70">Subtotal</dt><dd className="font-mono text-repixl-text-light">${subtotal}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/70">Shipping</dt><dd className="font-mono text-repixl-text-light">${SHIPPING_COST}</dd></div>
                {promoApplied && <div className="flex justify-between text-sm"><dt className="text-repixl-success">Discount</dt><dd className="font-mono text-repixl-success">-${discount}</dd></div>}
                <div className="border-t border-repixl-muted/10 pt-3"><div className="flex justify-between"><dt className="text-sm font-medium text-repixl-text-light">Total</dt><dd className="font-display text-xl font-bold text-repixl-text-light">${total}</dd></div></div>
              </dl>
              {!promoApplied && (
                <form onSubmit={handlePromo} className="mt-5"><label htmlFor="promo-code" className="sr-only">Promo code</label><div className="flex gap-2"><input id="promo-code" type="text" value={promoCode} onChange={(e) => setPromoCode(e.target.value)} placeholder="Voucher code" className="flex-1 rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none" /><button type="submit" className="rounded border border-repixl-muted/20 px-3 py-2 text-xs font-medium text-repixl-text-light/70 hover:border-repixl-muted/50 hover:text-repixl-text-light">Apply</button></div>{promoError && <p className="mt-1 text-xs text-red-400">{promoError}</p>}</form>
              )}
              {promoApplied && <p className="mt-4 font-mono text-[10px] text-repixl-success">✓ Voucher applied — ${discount} off</p>}
              <Button variant="primary" size="lg" className="mt-6 w-full" onClick={handleCheckout}>Proceed to Checkout</Button>
              <Link href="/products" className="mt-3 block text-center text-xs text-repixl-muted hover:text-repixl-text-light">Continue shopping</Link>
            </div>
          </aside>
        </div>
        <LoginRequiredModal isOpen={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
      </Container>
    </div>
  )
}
