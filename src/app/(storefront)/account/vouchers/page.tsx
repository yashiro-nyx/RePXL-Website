'use client'

import { useEffect, useState } from 'react'
import { Button, InlineLoader } from '@/components/ui'
import { useToastStore } from '@/stores/toastStore'

interface AvailableVoucher {
  code: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minPurchase: number
  maxDiscount: number
  validUntil: string
  description: string
}

function formatDiscount(v: AvailableVoucher): string {
  if (v.discountType === 'PERCENTAGE') {
    return `${v.discountValue}% OFF`
  }
  return `₱${v.discountValue.toLocaleString()} OFF`
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function MyVouchersPage() {
  const [vouchers, setVouchers] = useState<AvailableVoucher[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    fetch('/api/vouchers/available', { credentials: 'include' })
      .then((r) => r.json())
      .then((j) => setVouchers(j.data ?? []))
      .catch(() => addToast('Failed to load vouchers.', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      addToast(`Voucher code "${code}" copied!`, 'success')
      setTimeout(() => setCopied(null), 2500)
    } catch {
      addToast('Copy failed — please select and copy manually.', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">— Discounts &amp; deals</span>
        <h1 className="mt-1 font-display text-display-md text-repixl-text-light">My Vouchers</h1>
        <p className="mt-1 text-sm text-repixl-muted">
          Available promotional codes you can apply at checkout.
        </p>
      </div>

      {/* Architecture note */}
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal/40 px-4 py-3">
        <p className="text-xs text-repixl-muted">
          RePIXL uses global promotional codes — not individually assigned vouchers. All active codes below are available to any customer at checkout. Enter the code on the cart or checkout page to redeem it.
        </p>
      </div>

      {loading ? (
        <InlineLoader label="Loading vouchers…" className="min-h-[12rem]" />
      ) : vouchers.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-repixl-muted/20 py-20 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-repixl-muted/40" aria-hidden="true">
              <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v14"/>
            </svg>
          </div>
          <p className="font-display text-display-sm text-repixl-text-light/60">No active vouchers</p>
          <p className="mt-1 text-sm text-repixl-muted">Check back for promotions and deals.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {vouchers.map((v) => {
            const days = daysUntil(v.validUntil)
            const expiringSoon = days <= 3
            return (
              <div
                key={v.code}
                className="group relative overflow-hidden rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-colors hover:border-repixl-muted/20"
              >
                {/* Discount badge */}
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="rounded-xl bg-repixl-red/15 px-3 py-1.5 font-display text-xl font-bold text-repixl-red">
                    {formatDiscount(v)}
                  </span>
                  {expiringSoon && (
                    <span className="rounded-full bg-repixl-warning/15 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-repixl-warning">
                      Expires in {days}d
                    </span>
                  )}
                </div>

                {/* Description */}
                {v.description && (
                  <p className="mb-3 text-sm text-repixl-text-light/70">{v.description}</p>
                )}

                {/* Conditions */}
                <ul className="mb-4 space-y-1">
                  {v.minPurchase > 0 && (
                    <li className="flex items-center gap-1.5 font-mono text-[10px] text-repixl-muted">
                      <span className="text-repixl-muted/50">·</span>
                      Min. purchase ₱{v.minPurchase.toLocaleString()}
                    </li>
                  )}
                  {v.maxDiscount > 0 && (
                    <li className="flex items-center gap-1.5 font-mono text-[10px] text-repixl-muted">
                      <span className="text-repixl-muted/50">·</span>
                      Max discount ₱{v.maxDiscount.toLocaleString()}
                    </li>
                  )}
                  <li className="flex items-center gap-1.5 font-mono text-[10px] text-repixl-muted">
                    <span className="text-repixl-muted/50">·</span>
                    Valid until {new Date(v.validUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </li>
                </ul>

                {/* Code + copy */}
                <div className="flex items-center justify-between gap-3 rounded-lg border border-repixl-muted/15 bg-repixl-bg px-3 py-2">
                  <code className="select-all font-mono text-sm font-semibold tracking-widest text-repixl-text-light">
                    {v.code}
                  </code>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => copyCode(v.code)}
                    aria-label={`Copy voucher code ${v.code}`}
                  >
                    {copied === v.code ? (
                      <span className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>
                        Copied
                      </span>
                    ) : 'Copy'}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
