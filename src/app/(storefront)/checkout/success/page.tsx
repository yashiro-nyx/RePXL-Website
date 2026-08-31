'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Button } from '@/components/ui'
import { useCartStore } from '@/stores/cartStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'

function SuccessInner() {
  const params = useSearchParams()
  const orderNumber = params.get('order') ?? ''
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending'>('checking')

  useEffect(() => {
    // Payment is confirmed server-side by the webhook. Refresh local stores and
    // poll the order a few times in case the webhook is still in flight.
    useCartStore.getState().hydrate()
    let tries = 0
    const check = async () => {
      await useOrderHistoryStore.getState().hydrate()
      const order = useOrderHistoryStore
        .getState()
        .orders.find((o) => o.orderNumber === orderNumber)
      if (order) {
        setStatus('paid')
        return
      }
      tries += 1
      if (tries < 5) setTimeout(check, 1500)
      else setStatus('pending')
    }
    check()
  }, [orderNumber])

  return (
    <div className="burn-subtle min-h-screen pb-16 pt-24">
      <Container>
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-repixl-success/15">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h1 className="font-display text-display-md text-repixl-text-light">
            {status === 'pending' ? 'Payment received' : 'Thank you for your order'}
          </h1>
          <p className="mt-3 text-sm text-repixl-muted">
            {orderNumber ? (
              <>Your order <span className="font-mono text-repixl-text-light">{orderNumber}</span> has been confirmed.</>
            ) : (
              'Your payment was processed successfully.'
            )}
          </p>
          {status === 'pending' && (
            <p className="mt-2 text-xs text-repixl-muted">
              We&apos;re finalizing your order — it will appear in your order history shortly.
            </p>
          )}
          <div className="mt-8 flex gap-3">
            <Link href="/account/orders"><Button variant="primary" size="lg">View My Orders</Button></Link>
            <Link href="/products"><Button variant="secondary" size="lg">Continue Shopping</Button></Link>
          </div>
        </div>
      </Container>
    </div>
  )
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  )
}
