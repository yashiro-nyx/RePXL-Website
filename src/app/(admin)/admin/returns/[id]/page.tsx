'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { BackButton } from '@/components/ui'
import { formatPrice } from '@/lib/format'

interface ReturnDetail {
  id: string
  orderNumber: string
  customerName: string
  reason: string
  status: string
  rejectionReason?: string | null
  createdAt: string
  order: {
    total: number
    paymentStatus: string
    items: { name: string; condition: string; quantity: number }[]
  }
}

const statusStyles: Record<string, string> = {
  REQUESTED: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  UNDER_REVIEW: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  APPROVED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-red-500/15 text-red-400 border-red-500/30',
  REFUNDED: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
}

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ReturnDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    const res = await fetch(`/api/admin/returns/${id}`, { credentials: 'include' })
    const body = await res.json()
    if (res.ok) setDetail(body.data)
    setLoading(false)
  }

  useEffect(() => { void load() }, [id])

  const patch = async (payload: object) => {
    setSubmitting(true)
    setActionMsg(null)
    const res = await fetch(`/api/admin/returns/${id}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const body = await res.json()
    if (res.ok) {
      setActionMsg({ type: 'success', text: 'Status updated.' })
      await load()
      setRejectOpen(false)
      setRejectReason('')
    } else {
      setActionMsg({ type: 'error', text: body.error || 'Action failed.' })
    }
    setSubmitting(false)
  }

  const processRefund = async () => {
    setSubmitting(true)
    setActionMsg(null)
    const res = await fetch(`/api/admin/returns/${id}/refund`, {
      method: 'POST', credentials: 'include',
    })
    const body = await res.json()
    if (res.ok) {
      setActionMsg({ type: 'success', text: 'Refund processed successfully.' })
      await load()
    } else {
      setActionMsg({ type: 'error', text: body.error || 'Refund failed.' })
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-repixl-muted">Loading…</div>
  }
  if (!detail) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-repixl-muted">Return request not found.</p>
        <BackButton href="/admin/returns" label="Back to Returns" />
      </div>
    )
  }

  const { status } = detail
  const canUnderReview = status === 'REQUESTED'
  const canApprove = status === 'REQUESTED' || status === 'UNDER_REVIEW'
  const canReject = status === 'REQUESTED' || status === 'UNDER_REVIEW'
  const canRefund = status === 'APPROVED' && detail.order.paymentStatus === 'PAID'

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BackButton href="/admin/returns" label="Back to Returns" />
          <h1 className="font-display text-xl font-bold text-repixl-text-light">Return #{detail.id.slice(-8).toUpperCase()}</h1>
          <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${statusStyles[status] ?? ''}`}>
            {status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm ${actionMsg.type === 'success' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-red-500/30 bg-red-500/10 text-red-400'}`}>
          {actionMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        {/* Left: details */}
        <div className="space-y-5 xl:col-span-2">
          {/* Order info */}
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Order Details</p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted/60">Order #</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-repixl-red">#{detail.orderNumber}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted/60">Customer</p>
                <p className="mt-0.5 text-sm text-repixl-text-light">{detail.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted/60">Order Total</p>
                <p className="mt-0.5 font-mono text-sm text-repixl-text-light">{formatPrice(detail.order.total)}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted/60">Payment</p>
                <p className="mt-0.5 font-mono text-sm text-repixl-text-light/70">{detail.order.paymentStatus}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-repixl-muted/60">Requested</p>
                <p className="mt-0.5 font-mono text-xs text-repixl-text-light/70">{new Date(detail.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Items in Request</p>
            <div className="space-y-2">
              {detail.order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-repixl-bg/50 px-4 py-3">
                  <span className="text-sm text-repixl-text-light">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-repixl-muted">{item.condition}</span>
                    <span className="font-mono text-xs text-repixl-text-light/70">×{item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Customer Reason</p>
            <p className="text-sm leading-relaxed text-repixl-text-light/80">{detail.reason}</p>
          </div>

          {/* Rejection reason (if rejected) */}
          {status === 'REJECTED' && detail.rejectionReason && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-red-400/70">Rejection Reason</p>
              <p className="text-sm leading-relaxed text-red-400/80">{detail.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Right: actions */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5">
            <p className="mb-4 font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Actions</p>
            <div className="space-y-2.5">
              {canUnderReview && (
                <button onClick={() => patch({ status: 'UNDER_REVIEW' })} disabled={submitting}
                  className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50">
                  Mark Under Review
                </button>
              )}
              {canApprove && (
                <button onClick={() => patch({ status: 'APPROVED' })} disabled={submitting}
                  className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50">
                  Approve
                </button>
              )}
              {canReject && !rejectOpen && (
                <button onClick={() => setRejectOpen(true)} disabled={submitting}
                  className="w-full rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20 disabled:opacity-50">
                  Reject
                </button>
              )}
              {canRefund && (
                <button onClick={processRefund} disabled={submitting}
                  className="w-full rounded-xl bg-repixl-red px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                  {submitting ? 'Processing…' : 'Process Refund'}
                </button>
              )}
              {status === 'APPROVED' && detail.order.paymentStatus !== 'PAID' && (
                <p className="text-center text-xs text-repixl-muted">Order is not eligible for refund (payment status: {detail.order.paymentStatus})</p>
              )}
            </div>

            {/* Reject modal inline */}
            {rejectOpen && (
              <div className="mt-4 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm font-medium text-red-400">Provide rejection reason</p>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Enter reason (1–500 characters)…"
                  className="w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/40 focus:outline-none"
                />
                <p className="text-right font-mono text-[9px] text-repixl-muted">{rejectReason.length}/500</p>
                <div className="flex gap-2">
                  <button onClick={() => patch({ status: 'REJECTED', rejectionReason: rejectReason })}
                    disabled={submitting || !rejectReason.trim()}
                    className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50">
                    Confirm Rejection
                  </button>
                  <button onClick={() => { setRejectOpen(false); setRejectReason('') }}
                    className="flex-1 rounded-xl border border-repixl-muted/20 px-3 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
