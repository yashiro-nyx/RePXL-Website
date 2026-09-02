'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge, LegalModal } from '@/components/ui'
import { PhoneInput } from '@/components/ui/PhoneInput'
import { emptyPHAddress, type PHAddressValue } from '@/components/ui/PHAddressSelect'
import { MinimalFooter } from '@/components/layout/MinimalFooter'
import { useAuthStore } from '@/stores/authStore'
import { useCartStore } from '@/stores/cartStore'
import { useProductStore } from '@/stores/productStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { useAddressStore } from '@/stores/addressStore'
import { useRevealAnimation } from '@/hooks/useRevealAnimation'
import { useFilteredInput, nameChars, digitsOnly } from '@/hooks/useFilteredInput'
import { validatePHPhone } from '@/components/ui/PhoneInput'
import { isPaymongoEnabled, startPaymentIntent } from '@/lib/data/checkoutService'
import { usePaymentProcessor } from '@/components/checkout/PaymentProcessor'
import { termsContent, privacyContent } from '@/data/legal'
import type { Product, CartItem } from '@/types'

// Lazy-load the PH address component — keeps the address dataset out of the
// initial checkout bundle; it loads only when the form renders.
const PHAddressSelect = dynamic(
  () => import('@/components/ui/PHAddressSelect').then((m) => ({ default: m.PHAddressSelect })),
  { ssr: false, loading: () => <div className="h-28 animate-pulse rounded-xl bg-repixl-charcoal/40" /> }
)

const fallbackItems: CartItem[] = [
  { slug: 'canon-powershot-a520', quantity: 1 },
  { slug: 'fujifilm-finepix-f30', quantity: 1 },
]

type PaymentMethod = 'card' | 'gcash' | 'paypal'

interface CourierOption {
  id: string
  name: string
  price: number
  estimate: string
}

const couriers: CourierOption[] = [
  { id: 'jnt', name: 'J&T Express', price: 6, estimate: '2–3 business days' },
  { id: 'lbc', name: 'LBC Express', price: 8, estimate: '1–2 business days' },
  { id: 'ninja', name: 'Ninja Van', price: 5, estimate: '3–5 business days' },
  { id: 'grab', name: 'Grab Express', price: 12, estimate: 'Same day (metro only)' },
]

interface FormErrors {
  fullName?: string
  email?: string
  address?: string
  region?: string
  barangay?: string
  city?: string
  province?: string
  postalCode?: string
  phone?: string
  cardNumber?: string
  cardExpiry?: string
  cardCvc?: string
  agreeTerms?: string
}

interface OrderConfirmation {
  orderNumber: string
  fullName: string
  email: string
  phone: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  paymentMethod: PaymentMethod
  courier: CourierOption
  date: string
  subtotal: number
  total: number
  items: { product: Product; quantity: number }[]
  emailSent: boolean
}

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) }
function isValidPhone(v: string) { return /^\d{7,15}$/.test(v.replace(/[\s\-+()]/g, '')) }
function isValidPostalCode(v: string) { return /^\d{4,6}$/.test(v.replace(/\s/g, '')) }
function isValidCardNumber(v: string) { return /^\d{16}$/.test(v.replace(/\s/g, '')) }
function isValidExpiry(v: string) {
  const m = v.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/)
  if (!m) return false
  const month = parseInt(m[1], 10), year = parseInt(m[2], 10) + 2000
  if (month < 1 || month > 12) return false
  return new Date(year, month) > new Date()
}
function isValidCvc(v: string) { return /^\d{3,4}$/.test(v.trim()) }
function nonEmpty(v: string) { return v.trim().length > 0 }

const paymentLabels: Record<PaymentMethod, string> = {
  card: 'Credit / Debit Card',
  gcash: 'GCash',
  paypal: 'PayPal',
}

// Generate a human-readable order number: RPXL-YYYYMMDD-XXXXX
function generateOrderNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 7)
  return `RPXL-${date}-${suffix}`
}

export default function CheckoutPage() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const userName = `${useAuthStore((s) => s.firstName)} ${useAuthStore((s) => s.lastName)}`.trim()
  const userEmail = useAuthStore((s) => s.userEmail)
  const userPhone = useAuthStore((s) => s.userPhone)
  const hydrateAuth = useAuthStore((s) => s.hydrate)
  const router = useRouter()

  const cartItemsRaw = useCartStore((s) => s.items)
  const clearCart = useCartStore((s) => s.clearCart)
  const addOrder = useOrderHistoryStore((s) => s.addOrder)
  const allProducts = useProductStore((s) => s.products)
  const addresses = useAddressStore((s) => s.addresses)
  const defaultAddress = addresses.find((a) => a.isDefault)

  const itemsToResolve = cartItemsRaw.length > 0 ? cartItemsRaw : fallbackItems
  const cartItems = itemsToResolve.map((item) => {
    const product = allProducts.find((p) => p.slug === item.slug)
    return product ? { product, quantity: item.quantity } : null
  }).filter(Boolean) as { product: Product; quantity: number }[]

  // ── Controlled field state (address dropdowns need controlled values) ──
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [streetAddress, setStreetAddress] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [phAddr, setPhAddr] = useState<PHAddressValue>(emptyPHAddress)

  const [hydrated, setHydrated] = useState(false)
  const [confirmation, setConfirmation] = useState<OrderConfirmation | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card')
  const [selectedCourier, setSelectedCourier] = useState<string>(couriers[0].id)
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)
  const [prefilled, setPrefilled] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  // Input filters
  const nameFilter = useFilteredInput(nameChars)
  const digitsFilter = useFilteredInput(digitsOnly)

  useEffect(() => {
    const init = async () => {
      await hydrateAuth()
      await useCartStore.getState().hydrate()
      useProductStore.getState().hydrate()
      useAddressStore.getState().hydrate()
      useOrderHistoryStore.getState().hydrate()
      setHydrated(true)
    }
    void init()
  }, [hydrateAuth])

  // Pre-fill from auth + default address (controlled fields)
  useEffect(() => {
    if (!hydrated || prefilled) return
    if (userName) setFullName(userName)
    if (userEmail) setEmail(userEmail)
    if (userPhone) setPhone(userPhone)
    if (defaultAddress) {
      if (defaultAddress.fullName) setFullName(defaultAddress.fullName)
      if (defaultAddress.address) setStreetAddress(defaultAddress.address)
      if (defaultAddress.postalCode) setPostalCode(defaultAddress.postalCode)
      if (defaultAddress.phone) setPhone(defaultAddress.phone)
      // province/city/barangay are now dropdown-driven; free-text fallback for display
    }
    setPrefilled(true)
  }, [hydrated, prefilled, userName, userEmail, userPhone, defaultAddress])

  const courier = couriers.find((c) => c.id === selectedCourier)!
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
  const total = subtotal + courier.price

  const validate = (): FormErrors => {
    const form = formRef.current
    const get = (id: string) => (form?.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''
    const errs: FormErrors = {}

    // Shipping fields
    if (!nonEmpty(fullName)) errs.fullName = 'Full name is required.'
    if (!isValidEmail(email)) errs.email = 'Enter a valid email address.'
    if (!nonEmpty(streetAddress)) errs.address = 'Street address is required.'

    // Address dropdowns — must select Region first, then City, then Barangay
    if (!nonEmpty(phAddr.regionCode)) {
      errs.region = 'Please select a Region.'
    } else {
      // Province required only when the region has provinces (NCR has none — provinceCode = regionCode)
      if (phAddr.provinceCode !== phAddr.regionCode && !nonEmpty(phAddr.provinceCode)) {
        errs.province = 'Please select a Province / District.'
      }
      if (!nonEmpty(phAddr.cityCode)) errs.city = 'Please select a City / Municipality.'
      if (!nonEmpty(phAddr.barangay)) errs.barangay = 'Please select a Barangay.'
    }

    if (!isValidPostalCode(postalCode)) errs.postalCode = 'Enter a valid postal code (4–6 digits).'
    if (!validatePHPhone(phone.replace(/\D/g, ''))) errs.phone = 'Enter a valid PH mobile number (09XXXXXXXXX).'

    // Card fields
    if (paymentMethod === 'card') {
      if (!isValidCardNumber(get('card-number'))) errs.cardNumber = 'Enter a valid 16-digit card number.'
      const expiryRaw = get('card-expiry').replace(/\s/g, '')
      if (!isValidExpiry(expiryRaw)) errs.cardExpiry = 'Enter a valid, non-expired date (MM/YY).'
      if (!isValidCvc(get('card-cvc'))) errs.cardCvc = 'Enter a valid 3 or 4-digit CVC.'
    }

    if (!agreeTerms) errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.'
    return errs
  }

  const focusFirstError = (errs: FormErrors) => {
    const fieldMap: Record<string, string> = {
      fullName: 'full-name', email: 'email', address: 'address',
      postalCode: 'postal-code', phone: 'phone',
      cardNumber: 'card-number', cardExpiry: 'card-expiry', cardCvc: 'card-cvc',
      // Dropdown fields scroll to the section label
      barangay: 'ph-barangay', city: 'ph-city', province: 'ph-province', region: 'ph-region',
    }
    for (const key of Object.keys(errs) as (keyof FormErrors)[]) {
      if (errs[key]) {
        const id = fieldMap[key] ?? key
        const el = formRef.current?.querySelector(`#${id}`) as HTMLElement | null
        if (el) {
          el.focus()
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        break
      }
    }
  }

  // ── Payment processor (PIPM embedded flow) ──
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const { startPayment, isProcessing: paymentProcessing, authModal } = usePaymentProcessor({
    onSuccess: (orderNumber) => {
      // PayMongo confirmed — redirect to success page (which polls the DB)
      router.push(`/checkout/success?order=${orderNumber}`)
    },
    onError: (message) => {
      setPaymentError(message)
      setSubmitting(false)
    },
    onProcessing: () => setPaymentError(null),
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) { focusFirstError(newErrors); return }

    const form = formRef.current!
    const get = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''

    setSubmitting(true)
    setPaymentError(null)

    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const orderNum = generateOrderNumber()

    // ── Embedded PIPM flow (card / GCash / GrabPay / Maya) ──
    if (isPaymongoEnabled()) {
      try {
        const { clientKey, intentId, orderNumber } = await startPaymentIntent({
          fullName,
          address: streetAddress,
          barangay: phAddr.barangay,
          city: phAddr.city,
          province: phAddr.province,
          postalCode,
          courierName: courier.name,
          courierEstimate: courier.estimate,
          paymentMethod: paymentLabels[paymentMethod],
          shippingCost: courier.price,
        })

        const pmTypeMap: Record<PaymentMethod, string> = {
          card: 'card',
          gcash: 'gcash',
          paypal: 'card', // PayPal not a PIPM type — fall back to card
        }
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000'
        const returnUrl = `${siteUrl}/checkout/success?order=${orderNumber}`

        await startPayment({
          intentId,
          clientKey,
          orderNumber,
          returnUrl,
          type: pmTypeMap[paymentMethod] as 'card' | 'gcash' | 'grab_pay' | 'paymaya',
          card: paymentMethod === 'card' ? {
            cardNumber: get('card-number'),
            expMonth: (() => {
              const raw = get('card-expiry').replace(/\s/g, '')
              return parseInt(raw.split('/')[0] ?? '1', 10)
            })(),
            expYear: (() => {
              const raw = get('card-expiry').replace(/\s/g, '')
              const yy = parseInt(raw.split('/')[1] ?? '30', 10)
              return yy < 100 ? yy + 2000 : yy
            })(),
            cvc: get('card-cvc'),
            cardholderName: get('cardholder-name') || fullName,
            billingEmail: email,
            billingPhone: phone,
          } : undefined,
        })
        return
      } catch (err) {
        console.warn('PayMongo PIPM unavailable, using direct order flow.', err)
        setSubmitting(false)
      }
    }

    // ── Fallback: direct-order flow (PayMongo not configured) ──
    const orderData = {
      orderNumber: orderNum,
      date: dateStr,
      items: cartItems.map((i) => i.product),
      subtotal,
      shippingCost: courier.price,
      total: subtotal + courier.price,
      courierName: courier.name,
      courierEstimate: courier.estimate,
      paymentMethod: paymentLabels[paymentMethod],
      fullName,
      address: streetAddress,
      barangay: phAddr.barangay,
      city: phAddr.city,
      province: phAddr.province,
      postalCode,
      status: 'Processing' as const,
      userEmail: useAuthStore.getState().userEmail,
    }

    addOrder(orderData)
    clearCart()

    let emailSent = false
    try {
      const res = await fetch('/api/orders/confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber: orderNum, date: dateStr, email, fullName, phone,
          address: streetAddress, barangay: phAddr.barangay, city: phAddr.city,
          province: phAddr.province, postalCode,
          paymentMethod: paymentLabels[paymentMethod], courierName: courier.name,
          items: cartItems.map((i) => ({ name: i.product.name, quantity: i.quantity, price: i.product.price })),
          subtotal, shippingCost: courier.price, total: subtotal + courier.price,
        }),
      })
      emailSent = res.ok
    } catch { emailSent = false }

    setSubmitting(false)
    setConfirmation({
      orderNumber: orderNum, fullName, email, phone,
      address: streetAddress, barangay: phAddr.barangay, city: phAddr.city,
      province: phAddr.province, postalCode, paymentMethod, courier, date: dateStr,
      subtotal, total: subtotal + courier.price, items: cartItems, emailSent,
    })
    window.scrollTo({ top: 0 })
  }


  useEffect(() => {
    if (hydrated && !isLoggedIn && !confirmation) {
      router.push('/cart')
    }
  }, [hydrated, isLoggedIn, confirmation, router])

  // ─── CONFIRMATION / RECEIPT PAGE ───
  if (confirmation) {
    return (
      <div className="burn-subtle min-h-screen pb-16 pt-24">
        <Container>
          <div className="mx-auto max-w-2xl">
            {/* Screen header */}
            <div className="no-print mb-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/10">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
              </div>
              <h1 className="mt-4 font-display text-display-md text-repixl-text-light">Order Confirmed</h1>
              <p className="mt-2 text-sm text-repixl-text-light/70">
                Thank you for your order, {confirmation.fullName.split(' ')[0]}.
              </p>
              {!confirmation.emailSent && (
                <p className="mt-2 text-xs text-repixl-muted">
                  Your order was successfully placed. We were unable to send the confirmation email.
                </p>
              )}
            </div>

            {/* RECEIPT — visible on screen and in print */}
            <div id="receipt" className="receipt-print-area rounded-lg border border-repixl-muted/20 bg-repixl-charcoal p-6 md:p-8">

              {/* Receipt header */}
              <div className="mb-6 border-b border-repixl-muted/10 pb-6 text-center">
                <p className="font-display text-2xl font-bold text-repixl-text-light">RePXL</p>
                <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-repixl-muted print-muted">Order Receipt</p>
              </div>

              {/* Order meta */}
              <div className="mb-6 grid grid-cols-2 gap-4 border-b border-repixl-muted/10 pb-6">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Number</p>
                  <p className="mt-1 font-mono text-sm font-semibold text-repixl-red print-red">{confirmation.orderNumber}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Date</p>
                  <p className="mt-1 text-sm text-repixl-text-light">{confirmation.date}</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Status</p>
                  <p className="mt-1 text-sm text-repixl-text-light">Processing</p>
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Payment</p>
                  <p className="mt-1 text-sm text-repixl-text-light">{paymentLabels[confirmation.paymentMethod]}</p>
                </div>
              </div>

              {/* Customer info */}
              <div className="mb-6 border-b border-repixl-muted/10 pb-6">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Customer Information</p>
                <p className="text-sm text-repixl-text-light">{confirmation.fullName}</p>
                <p className="text-sm text-repixl-text-light/70">{confirmation.email}</p>
                {confirmation.phone && <p className="text-sm text-repixl-text-light/70">{confirmation.phone}</p>}
              </div>

              {/* Shipping address */}
              <div className="mb-6 border-b border-repixl-muted/10 pb-6">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Shipping Address</p>
                <p className="text-sm text-repixl-text-light">{confirmation.fullName}</p>
                <p className="text-sm text-repixl-text-light/70">{confirmation.address}</p>
                <p className="text-sm text-repixl-text-light/70">{confirmation.barangay}</p>
                <p className="text-sm text-repixl-text-light/70">{confirmation.city}, {confirmation.province}</p>
                <p className="text-sm text-repixl-text-light/70">{confirmation.postalCode}</p>
                <p className="mt-1 font-mono text-[10px] text-repixl-muted print-muted">via {confirmation.courier.name} · {confirmation.courier.estimate}</p>
              </div>

              {/* Order items */}
              <div className="mb-6 border-b border-repixl-muted/10 pb-6">
                <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Order Items</p>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-repixl-muted/10">
                      <th className="pb-2 text-left font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Item</th>
                      <th className="pb-2 text-center font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Qty</th>
                      <th className="pb-2 text-right font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Price</th>
                      <th className="pb-2 text-right font-mono text-[9px] uppercase tracking-wider text-repixl-muted print-muted">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-repixl-muted/10">
                    {confirmation.items.map((item) => (
                      <tr key={item.product.slug}>
                        <td className="py-2 text-repixl-text-light">{item.product.name}</td>
                        <td className="py-2 text-center font-mono text-repixl-text-light/70">{item.quantity}</td>
                        <td className="py-2 text-right font-mono text-repixl-text-light/70">${item.product.price}</td>
                        <td className="py-2 text-right font-mono text-repixl-text-light">${item.product.price * item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Order summary */}
              <div className="mb-6">
                <dl className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-text-light/70">Subtotal</dt>
                    <dd className="font-mono text-repixl-text-light">${confirmation.subtotal}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-repixl-text-light/70">Shipping ({confirmation.courier.name})</dt>
                    <dd className="font-mono text-repixl-text-light">${confirmation.courier.price}</dd>
                  </div>
                  <div className="flex justify-between border-t border-repixl-muted/10 pt-2">
                    <dt className="font-semibold text-repixl-text-light">Total</dt>
                    <dd className="font-display text-xl font-bold text-repixl-text-light">${confirmation.total}</dd>
                  </div>
                </dl>
              </div>

              {/* Receipt footer */}
              <div className="border-t border-repixl-muted/10 pt-4 text-center">
                <p className="font-mono text-[9px] uppercase tracking-widest text-repixl-muted print-muted">Thank you for shopping with RePXL</p>
                <p className="mt-1 font-mono text-[9px] text-repixl-muted/60 print-muted">Vintage Digital Cameras · Condition-graded · Serial-verified</p>
              </div>
            </div>

            {/* Action buttons — hidden when printing */}
            <div className="no-print mt-6 flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded bg-repixl-red px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect width="12" height="8" x="6" y="14" /></svg>
                Print Receipt
              </button>
              <Link href="/account/orders">
                <Button variant="secondary" size="md">View Order History</Button>
              </Link>
              <Link href="/products" className="text-sm text-repixl-muted hover:text-repixl-text-light">Continue shopping</Link>
            </div>
          </div>
        </Container>
        <MinimalFooter />
      </div>
    )
  }

  if (!hydrated || !isLoggedIn) return null

  return (
    <div className="burn-subtle min-h-screen pb-20 pt-24">
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8 border-b border-repixl-muted/10 pb-6"
        >
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">— Complete your order</span>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light md:text-display-lg">Checkout</h1>
        </motion.div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Validation error summary — shown when user hits submit with errors */}
          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              aria-live="polite"
              className="lg:col-span-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3"
            >
              <p className="text-sm font-semibold text-red-400">Please fix the following before placing your order:</p>
              <ul className="mt-1.5 list-inside list-disc space-y-0.5">
                {(Object.values(errors).filter(Boolean) as string[]).map((msg) => (
                  <li key={msg} className="text-xs text-red-400/80">{msg}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="space-y-8 lg:col-span-2">
            {/* Shipping info */}
            <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal/30 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-repixl-red/15 font-mono text-xs font-bold text-repixl-red">1</div>
                <h2 className="font-display text-base font-semibold text-repixl-text-light">Shipping Information</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FieldWrapper id="full-name" label="Full Name" error={errors.fullName} className="sm:col-span-2">
                  <input
                    id="full-name"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={inputClass(errors.fullName)}
                    {...nameFilter}
                  />
                </FieldWrapper>
                <FieldWrapper id="email" label="Email Address" error={errors.email} className="sm:col-span-2">
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass(errors.email)}
                  />
                </FieldWrapper>
                <div className="sm:col-span-2">
                  <label htmlFor="phone" className="mb-1 block text-xs text-repixl-text-light/70">Phone Number</label>
                  <PhoneInput
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    error={errors.phone}
                    autoComplete="tel"
                  />
                </div>
                <FieldWrapper id="address" label="Street Address / House No." error={errors.address} className="sm:col-span-2">
                  <input
                    id="address"
                    type="text"
                    autoComplete="street-address"
                    value={streetAddress}
                    onChange={(e) => setStreetAddress(e.target.value)}
                    className={inputClass(errors.address)}
                  />
                </FieldWrapper>

                {/* Cascading PH address dropdowns */}
                <div className="sm:col-span-2">
                  <PHAddressSelect
                    value={phAddr}
                    onChange={setPhAddr}
                    errors={{
                      region: errors.region,
                      province: errors.province,
                      city: errors.city,
                      barangay: errors.barangay,
                    }}
                    disabled={submitting || paymentProcessing}
                  />
                </div>

                <FieldWrapper id="postal-code" label="Postal Code" error={errors.postalCode}>
                  <input
                    id="postal-code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    maxLength={6}
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className={inputClass(errors.postalCode)}
                    disabled={submitting || paymentProcessing}
                    {...digitsFilter}
                  />
                </FieldWrapper>
              </div>
            </section>

            {/* Delivery courier */}
            <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal/30 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-repixl-red/15 font-mono text-xs font-bold text-repixl-red">2</div>
                <h2 className="font-display text-base font-semibold text-repixl-text-light">Delivery Courier</h2>
              </div>
              <fieldset>
                <legend className="sr-only">Select delivery courier</legend>
                <div className="space-y-2">
                  {couriers.map((c) => (
                    <label key={c.id} className={`flex cursor-pointer items-center justify-between rounded border px-4 py-3 transition-colors ${selectedCourier === c.id ? 'border-repixl-red bg-repixl-red/10' : 'border-repixl-muted/20 hover:border-repixl-muted/40'}`}>
                      <div className="flex items-center gap-3">
                        <input type="radio" name="courier" value={c.id} checked={selectedCourier === c.id} onChange={() => setSelectedCourier(c.id)} className="sr-only" />
                        <div className={`flex h-4 w-4 items-center justify-center rounded-full border ${selectedCourier === c.id ? 'border-repixl-red' : 'border-repixl-muted/40'}`}>
                          {selectedCourier === c.id && <span className="h-2 w-2 rounded-full bg-repixl-red" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-repixl-text-light">{c.name}</p>
                          <p className="font-mono text-[10px] text-repixl-muted">{c.estimate}</p>
                        </div>
                      </div>
                      <span className="font-mono text-sm font-medium text-repixl-text-light">${c.price}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </section>

            {/* Payment method */}
            <section className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal/30 p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-repixl-red/15 font-mono text-xs font-bold text-repixl-red">3</div>
                <h2 className="font-display text-base font-semibold text-repixl-text-light">Payment Method</h2>
              </div>
              <fieldset>
                <legend className="sr-only">Select payment method</legend>
                <div className="flex flex-wrap gap-3">
                  {([{ id: 'card' as const, label: 'Credit / Debit Card' }, { id: 'gcash' as const, label: 'GCash' }, { id: 'paypal' as const, label: 'PayPal' }]).map((method) => (
                    <label key={method.id} className={`flex cursor-pointer items-center gap-2 rounded border px-4 py-2.5 text-sm transition-colors ${paymentMethod === method.id ? 'border-repixl-red bg-repixl-red/10 text-repixl-text-light' : 'border-repixl-muted/20 text-repixl-text-light/70 hover:border-repixl-muted/40'}`}>
                      <input type="radio" name="payment-method" value={method.id} checked={paymentMethod === method.id} onChange={() => setPaymentMethod(method.id)} className="sr-only" />
                      {method.label}
                    </label>
                  ))}
                </div>
              </fieldset>
              {paymentMethod === 'card' && (
                <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FieldWrapper id="cardholder-name" label="Cardholder Name" error={undefined} className="sm:col-span-3">
                    <input id="cardholder-name" type="text" placeholder="As shown on card" autoComplete="cc-name"
                      defaultValue={fullName}
                      className={`font-mono ${inputClass()}`} {...nameFilter} />
                  </FieldWrapper>
                  <FieldWrapper id="card-number" label="Card Number" error={errors.cardNumber} className="sm:col-span-3">
                    <input id="card-number" type="text" inputMode="numeric" placeholder="1234 5678 9012 3456" autoComplete="cc-number" maxLength={19}
                      className={`font-mono ${inputClass(errors.cardNumber)}`} {...digitsFilter} />
                  </FieldWrapper>
                  <FieldWrapper id="card-expiry" label="Expiry (MM/YY)" error={errors.cardExpiry} className="sm:col-span-2">
                    <input id="card-expiry" type="text" placeholder="MM / YY" autoComplete="cc-exp" className={`font-mono ${inputClass(errors.cardExpiry)}`} />
                  </FieldWrapper>
                  <FieldWrapper id="card-cvc" label="CVC" error={errors.cardCvc}>
                    <input id="card-cvc" type="text" inputMode="numeric" placeholder="123" autoComplete="cc-csc" maxLength={4}
                      className={`font-mono ${inputClass(errors.cardCvc)}`} {...digitsFilter} />
                  </FieldWrapper>
                </div>
              )}
              {paymentMethod === 'gcash' && (
                <div className="mt-5 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
                  <p className="text-sm font-medium text-repixl-text-light">GCash</p>
                  <p className="mt-1 text-xs text-repixl-muted">After placing your order, you&apos;ll authorize the GCash payment in a secure window on this page — no full redirect needed.</p>
                </div>
              )}
              {paymentMethod === 'paypal' && (
                <div className="mt-5 rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-4">
                  <p className="text-sm text-repixl-text-light/70">PayPal is processed as a card payment via PayMongo.</p>
                </div>
              )}            </section>
          </div>

          {/* Order summary sidebar */}
          <aside className="lg:col-span-1">
            <div className="sticky top-24 overflow-hidden rounded-xl border border-repixl-muted/10 bg-repixl-charcoal">
              {/* Sidebar header */}
              <div className="border-b border-repixl-muted/10 px-6 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-repixl-red/15 font-mono text-[10px] font-bold text-repixl-red">4</div>
                  <h2 className="font-display text-sm font-semibold text-repixl-text-light">Order Summary</h2>
                </div>
              </div>
              <div className="p-6">
              <ul className="space-y-3">
                {cartItems.map((item) => (
                  <li key={item.product.slug} className="flex items-center gap-3">
                    <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-repixl-bg">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.product.image} alt={item.product.name} className="h-full w-full object-contain" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-repixl-text-light">{item.product.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</p>
                      <ConditionBadge condition={item.product.condition} className="mt-0.5 origin-left scale-90" />
                    </div>
                    <span className="font-mono text-sm text-repixl-text-light">${item.product.price * item.quantity}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-5 space-y-2 border-t border-repixl-muted/10 pt-4">
                <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/70">Subtotal</dt><dd className="font-mono text-repixl-text-light">${subtotal}</dd></div>
                <div className="flex justify-between text-sm"><dt className="text-repixl-text-light/70">Shipping ({courier.name})</dt><dd className="font-mono text-repixl-text-light">${courier.price}</dd></div>
                <div className="flex justify-between border-t border-repixl-muted/10 pt-2"><dt className="text-sm font-medium text-repixl-text-light">Total</dt><dd className="font-display text-xl font-bold text-repixl-text-light">${total}</dd></div>
              </dl>
              <Button type="submit" variant="primary" size="lg" disabled={submitting || paymentProcessing} className="mt-6 w-full disabled:opacity-60">
                {(submitting || paymentProcessing) ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing…
                  </span>
                ) : 'Place Order'}
              </Button>

              {/* Payment error inline */}
              {paymentError && (
                <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3" role="alert">
                  <p className="text-xs text-red-400">{paymentError}</p>
                  <p className="mt-1 text-[10px] text-red-400/70">Please check your details and try again, or choose a different payment method.</p>
                </div>
              )}
              {/* Security trust note */}
              <div className="mt-3 flex items-center justify-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-repixl-muted/50" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="font-mono text-[9px] text-repixl-muted/50">Secure · Encrypted · Protected</span>
              </div>
              <div className="mt-4">
                <label className="flex cursor-pointer items-start gap-2">
                  <input
                    id="agree-terms"
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => {
                      // If checking: open the Terms modal instead of checking directly.
                      // The modal's "I Agree" button is what actually sets agreeTerms=true.
                      // If unchecking: allow directly.
                      if (e.target.checked) {
                        setTermsModalOpen(true)
                      } else {
                        setAgreeTerms(false)
                      }
                    }}
                    className="mt-0.5 h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-repixl-red/30"
                  />
                  <span className="text-[11px] leading-tight text-repixl-muted">
                    I agree to the{' '}
                    <button type="button" onClick={() => setTermsModalOpen(true)} className="text-repixl-text-light/80 underline hover:text-repixl-text-light">Terms of Service</button>
                    {' '}and{' '}
                    <button type="button" onClick={() => setPrivacyModalOpen(true)} className="text-repixl-text-light/80 underline hover:text-repixl-text-light">Privacy Policy</button>.
                  </span>
                </label>
                {errors.agreeTerms && <p className="mt-1 text-xs text-red-400" role="alert">{errors.agreeTerms}</p>}
              </div>
              <LegalModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} title="Terms of Service" content={termsContent} onAgree={() => setAgreeTerms(true)} />
              <LegalModal isOpen={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} title="Privacy Policy" content={privacyContent} />
              </div>{/* close p-6 */}
            </div>
          </aside>
        </form>
      </Container>
      {/* 3DS / e-wallet auth modal — rendered as a portal over the full page */}
      {authModal}
      <MinimalFooter />
    </div>
  )
}

function FieldWrapper({ id, label, error, className = '', children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs text-repixl-text-light/70">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-400" role="alert">{error}</p>}
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-charcoal focus:border-repixl-muted/50'
  }`
}
