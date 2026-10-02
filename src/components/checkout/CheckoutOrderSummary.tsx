'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ConditionBadge } from '@/components/ui'
import { formatPrice } from '@/lib/format'
import type { Product } from '@/types'

export interface OrderSummaryLine {
  product: Product
  quantity: number
}

interface SummaryContentProps {
  items: OrderSummaryLine[]
  subtotal: number
  shippingLabel: string
  shippingCost: number
  total: number
}

function SummaryLines({ items }: { items: OrderSummaryLine[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.product.slug} className="flex items-center gap-3">
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg bg-repixl-bg">
            <Image src={item.product.image} alt={item.product.name} width={48} height={48} sizes="48px" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-repixl-text-light">
              {item.product.name}
              {item.quantity > 1 ? ` ×${item.quantity}` : ''}
            </p>
            <ConditionBadge condition={item.product.condition} className="mt-0.5 origin-left scale-90" />
          </div>
          <span className="flex-shrink-0 font-mono text-sm text-repixl-text-light">
            {formatPrice(item.product.price * item.quantity)}
          </span>
        </li>
      ))}
    </ul>
  )
}

function SummaryTotals({ subtotal, shippingLabel, shippingCost, total }: Omit<SummaryContentProps, 'items'>) {
  return (
    <dl className="mt-5 space-y-2 border-t border-repixl-muted/10 pt-4">
      <div className="flex justify-between text-sm">
        <dt className="text-repixl-text-light/70">Subtotal</dt>
        <dd className="font-mono text-repixl-text-light">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between text-sm">
        <dt className="text-repixl-text-light/70">Shipping{shippingLabel ? ` (${shippingLabel})` : ''}</dt>
        <dd className="font-mono text-repixl-text-light">{formatPrice(shippingCost)}</dd>
      </div>
      <div className="flex justify-between border-t border-repixl-muted/10 pt-2">
        <dt className="text-sm font-medium text-repixl-text-light">Total</dt>
        <dd className="font-display text-xl font-bold text-repixl-text-light">{formatPrice(total)}</dd>
      </div>
    </dl>
  )
}

/**
 * Desktop order summary — a sticky panel beside the current checkout step.
 * Shows the real line items + subtotal/shipping/total (all display-only; the
 * server remains the source of truth for the charged total). Optional `footer`
 * lets the page render the terms checkbox / notes inside the panel.
 */
export function CheckoutOrderSummary({
  items,
  subtotal,
  shippingLabel,
  shippingCost,
  total,
  footer,
}: SummaryContentProps & { footer?: React.ReactNode }) {
  return (
    <div className="sticky top-24 overflow-hidden rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal">
      <div className="border-b border-repixl-muted/10 px-6 py-4">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-repixl-text-light">Order Summary</h2>
      </div>
      <div className="p-6">
        <SummaryLines items={items} />
        <SummaryTotals subtotal={subtotal} shippingLabel={shippingLabel} shippingCost={shippingCost} total={total} />
        {footer}
      </div>
    </div>
  )
}

/**
 * Mobile order summary — a collapsible disclosure showing "Order Summary · ₱N"
 * that expands to the line items + totals. Keeps the summary from permanently
 * occupying scarce mobile screen space. Accessible via `aria-expanded`/`aria-controls`.
 */
export function MobileOrderSummary({ items, subtotal, shippingLabel, shippingCost, total }: SummaryContentProps) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-order-summary"
        className="flex w-full items-center justify-between px-4 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
      >
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-repixl-text-light">Order Summary</span>
          <span className="text-repixl-muted/50" aria-hidden="true">·</span>
          <span className="font-display text-sm font-bold text-repixl-text-light">{formatPrice(total)}</span>
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-repixl-muted transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div id="mobile-order-summary" className="border-t border-repixl-muted/10 px-4 pb-4 pt-4">
          <SummaryLines items={items} />
          <SummaryTotals subtotal={subtotal} shippingLabel={shippingLabel} shippingCost={shippingCost} total={total} />
        </div>
      )}
    </div>
  )
}
