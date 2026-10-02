'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button, ImageLightbox, PageBackLink } from '@/components/ui'
import { ReturnProgress } from '@/components/account/ReturnProgress'
import { formatPrice } from '@/lib/format'
import type { ReturnWorkflow } from '@/lib/return-workflow'

interface ReturnDetail extends ReturnWorkflow {
  id: string
  reason: string
  refundStatus: string | null
  items: { orderItemId: string; quantity: number }[]
  user: { firstName: string; lastName: string; email: string }
  order: {
    orderNumber: string
    total: number
    paymentStatus: string
    paymentMethod: string
    items: {
      id: string
      quantity: number
      product: { name: string; condition: string }
    }[]
  }
  refundQuote: {
    itemsAmount: number
    shippingAmount: number
    maxAmount: number
    includesAllItems: boolean
  }
}
interface EvidenceImage {
  id: string
  signedUrl: string
}
const panel = 'rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5'
const inputClass =
  'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light focus:outline-none focus:ring-2 focus:ring-repixl-red/40'

export default function ReturnDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<ReturnDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const lock = useRef(false)
  const [instructions, setInstructions] = useState('')
  const [rejection, setRejection] = useState('')
  const [inspection, setInspection] = useState('')
  const [restock, setRestock] = useState(false)
  const [includeShipping, setIncludeShipping] = useState(false)
  const [manualReference, setManualReference] = useState('')
  const [confirmRefund, setConfirmRefund] = useState(false)
  const [images, setImages] = useState<EvidenceImage[]>([])
  const [activeImage, setActiveImage] = useState<number | null>(null)
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Unable to load this return.')
      setDetail(body.data)
      const evidenceRes = await fetch(
        `/api/upload/return-image/signed?returnRequestId=${id}`,
        { credentials: 'include', cache: 'no-store' }
      )
      if (evidenceRes.ok)
        setImages((await evidenceRes.json()).data?.images ?? [])
      else
        setError(
          'Return loaded, but evidence could not be loaded. Refresh before reviewing it.'
        )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load this return.'
      )
    } finally {
      setLoading(false)
    }
  }, [id])
  useEffect(() => {
    void load()
  }, [load])
  const mutate = async (payload: object, refund = false) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const res = await fetch(
        `/api/admin/returns/${id}${refund ? '/refund' : ''}`,
        {
          method: refund ? 'POST' : 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )
      const body = await res.json()
      if (!res.ok)
        throw new Error(body.error || 'Unable to complete this action.')
      setDetail(body.data)
      setConfirmRefund(false)
      setNotice(
        refund
          ? body.data.status === 'REFUNDED'
            ? 'Refund completed.'
            : 'Refund status updated. Completion depends on the provider response.'
          : 'Return updated.'
      )
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Action failed. Refresh and try again.'
      )
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  useEffect(() => {
    if (
      !detail?.refundId ||
      detail.status !== 'APPROVED' ||
      detail.refundStatus === 'failed'
    )
      return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible' && !lock.current)
        void mutate({ checkOnly: true }, true)
    }, 15000)
    return () => clearInterval(timer)
  }, [detail?.refundId, detail?.status, detail?.refundStatus])
  if (loading)
    return (
      <p className="py-12 text-center text-sm text-repixl-muted">
        Loading return...
      </p>
    )
  const isCod = Boolean(
    detail &&
      /^(cod|cash on delivery)$/i.test(detail.order.paymentMethod.trim())
  )
  const reviewable =
    detail && ['REQUESTED', 'UNDER_REVIEW'].includes(detail.status)
  const approved = detail?.status === 'APPROVED'
  const amount =
    detail?.refundAmount ??
    (detail?.refundQuote.itemsAmount ?? 0) +
      (includeShipping ? (detail?.refundQuote.shippingAmount ?? 0) : 0)
  return (
    <div className="space-y-6">
      <PageBackLink href="/admin/returns" label="Returns" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-repixl-text-light">
          Return #{id.slice(-8).toUpperCase()}
        </h1>
        <Button
          variant="secondary"
          size="sm"
          disabled={busy}
          onClick={() => {
            setError('')
            void load()
          }}
        >
          Refresh details & evidence
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          {notice}
        </p>
      )}
      {detail && (
        <>
          <ReturnProgress request={detail} />
          <div className="grid gap-5 xl:grid-cols-3">
            <div className="space-y-5 xl:col-span-2">
              <section className={panel}>
                <h2 className="font-display text-lg text-repixl-text-light">
                  Request details
                </h2>
                <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-repixl-muted">Order</dt>
                    <dd className="mt-1 text-repixl-text-light">
                      {detail.order.orderNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-repixl-muted">Customer</dt>
                    <dd className="mt-1 text-repixl-text-light">
                      {`${detail.user.firstName} ${detail.user.lastName}`.trim() ||
                        detail.user.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-repixl-muted">Payment</dt>
                    <dd className="mt-1 text-repixl-text-light">
                      {detail.order.paymentMethod} /{' '}
                      {detail.order.paymentStatus}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-repixl-muted">Order total</dt>
                    <dd className="mt-1 text-repixl-text-light">
                      {formatPrice(detail.order.total)}
                    </dd>
                  </div>
                </dl>
                <h3 className="mt-5 text-sm font-medium text-repixl-text-light">
                  Reason
                </h3>
                <p className="mt-2 whitespace-pre-wrap text-sm text-repixl-muted">
                  {detail.reason}
                </p>
                <h3 className="mt-5 text-sm font-medium text-repixl-text-light">
                  Selected items
                </h3>
                <ul className="mt-2 space-y-2 text-sm text-repixl-muted">
                  {detail.order.items
                    .filter(
                      (item) =>
                        !detail.items.length ||
                        detail.items.some(
                          (selected) => selected.orderItemId === item.id
                        )
                    )
                    .map((item) => (
                      <li key={item.id}>
                        {item.product.name} / {item.product.condition} ? Qty{' '}
                        {detail.items.find(
                          (selected) => selected.orderItemId === item.id
                        )?.quantity ?? item.quantity}
                      </li>
                    ))}
                </ul>
              </section>
              <section className={panel}>
                <h2 className="font-display text-lg text-repixl-text-light">
                  Photo evidence
                </h2>
                {images.length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setActiveImage(index)}
                        aria-label={`Open evidence photo ${index + 1}`}
                        className="overflow-hidden rounded-xl border border-repixl-muted/20"
                      >
                        <img
                          src={image.signedUrl}
                          alt={`Return evidence ${index + 1}`}
                          className="h-28 w-28 object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-repixl-muted">
                    No evidence photos loaded. Check the reason and refresh if
                    evidence is required.
                  </p>
                )}
              </section>
              {detail.returnInstructions && (
                <section className={panel}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Return instructions sent to customer
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-repixl-muted">
                    {detail.returnInstructions}
                  </p>
                </section>
              )}
              {detail.returnTrackingNumber && (
                <section className={panel}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Return shipment
                  </h2>
                  <p className="mt-3 text-sm text-repixl-muted">
                    {detail.returnCarrier} / {detail.returnTrackingNumber}
                  </p>
                </section>
              )}
              {detail.inspectionNotes && (
                <section className={panel}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Inspection record
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-repixl-muted">
                    {detail.inspectionNotes}
                  </p>
                </section>
              )}
            </div>
            <aside className="space-y-5">
              {(reviewable || (approved && !detail.receivedAt)) && (
                <section className={`${panel} space-y-4`}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Review request
                  </h2>
                  {detail.status === 'REQUESTED' && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => void mutate({ action: 'review' })}
                    >
                      Start review
                    </Button>
                  )}
                  <label className="block space-y-2 text-sm text-repixl-muted">
                    <span>Return address / pickup instructions</span>
                    <textarea
                      rows={5}
                      maxLength={2000}
                      className={inputClass}
                      value={instructions}
                      onChange={(event) => setInstructions(event.target.value)}
                      disabled={busy}
                      placeholder="Provide the actual return address or pickup arrangement, packaging requirements, and who covers return shipping."
                    />
                  </label>
                  <Button
                    disabled={busy || instructions.trim().length < 10}
                    onClick={() =>
                      void mutate({
                        action: approved ? 'instructions' : 'approve',
                        returnInstructions: instructions.trim(),
                      })
                    }
                  >
                    {approved
                      ? 'Update return instructions'
                      : 'Approve & send instructions'}
                  </Button>
                </section>
              )}
              {(reviewable ||
                (approved &&
                  !detail.inspectedAt &&
                  !detail.refundStartedAt)) && (
                <section className={`${panel} space-y-3`}>
                  <label className="block space-y-2 text-sm text-repixl-muted">
                    <span>Decline reason</span>
                    <textarea
                      className={inputClass}
                      rows={3}
                      maxLength={500}
                      value={rejection}
                      onChange={(event) => setRejection(event.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <Button
                    variant="secondary"
                    disabled={busy || !rejection.trim()}
                    onClick={() =>
                      void mutate({
                        action: 'reject',
                        rejectionReason: rejection.trim(),
                      })
                    }
                  >
                    Decline return
                  </Button>
                </section>
              )}
              {approved && !detail.receivedAt && (
                <section className={`${panel} space-y-3`}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Receive return
                  </h2>
                  <p className="text-sm text-repixl-muted">
                    Record receipt only when the selected items have physically
                    arrived.
                  </p>
                  <Button
                    disabled={busy}
                    onClick={() => void mutate({ action: 'receive' })}
                  >
                    Confirm items received
                  </Button>
                </section>
              )}
              {approved && detail.receivedAt && !detail.inspectedAt && (
                <section className={`${panel} space-y-4`}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Inspect items
                  </h2>
                  <label className="block space-y-2 text-sm text-repixl-muted">
                    <span>Condition and inspection result</span>
                    <textarea
                      className={inputClass}
                      rows={4}
                      maxLength={1000}
                      value={inspection}
                      onChange={(event) => setInspection(event.target.value)}
                      disabled={busy}
                      placeholder="Check serials, condition, parts/accessories, and the reported issue."
                    />
                  </label>
                  <label className="flex items-start gap-2 text-sm text-repixl-muted">
                    <input
                      type="checkbox"
                      checked={restock}
                      onChange={(event) => setRestock(event.target.checked)}
                      disabled={busy}
                    />
                    <span>
                      All selected units are fit for resale. Restore their
                      inventory once.
                    </span>
                  </label>
                  <Button
                    disabled={busy || inspection.trim().length < 10}
                    onClick={() =>
                      void mutate({
                        action: 'inspect',
                        inspectionNotes: inspection.trim(),
                        restock,
                      })
                    }
                  >
                    Accept inspection
                  </Button>
                  <p className="text-xs text-repixl-muted">
                    Use Decline return above if inspection does not support
                    acceptance.
                  </p>
                </section>
              )}
              {approved && detail.inspectedAt && (
                <section className={`${panel} space-y-4`}>
                  <h2 className="font-display text-lg text-repixl-text-light">
                    Issue refund
                  </h2>
                  <p className="text-sm text-repixl-muted">
                    Selected items after discounts:{' '}
                    {formatPrice(detail.refundQuote.itemsAmount)}
                  </p>
                  {detail.refundQuote.includesAllItems &&
                    !detail.refundStartedAt && (
                      <label className="flex items-start gap-2 text-sm text-repixl-muted">
                        <input
                          type="checkbox"
                          checked={includeShipping}
                          onChange={(event) =>
                            setIncludeShipping(event.target.checked)
                          }
                          disabled={busy}
                        />
                        <span>
                          Also refund original shipping:{' '}
                          {formatPrice(detail.refundQuote.shippingAmount)}
                        </span>
                      </label>
                    )}
                  <p className="text-lg font-semibold text-repixl-text-light">
                    Refund: {formatPrice(amount)}
                  </p>
                  <p className="text-xs text-repixl-muted">
                    {isCod
                      ? 'Complete the actual COD repayment first, then record its transaction/receipt reference below.'
                      : 'Sent back through PayMongo to the original payment method. Pending provider responses stay in processing.'}
                  </p>
                  {isCod && (
                    <label className="block space-y-2 text-sm text-repixl-muted">
                      <span>Completed COD repayment reference</span>
                      <input
                        className={inputClass}
                        maxLength={150}
                        value={manualReference}
                        onChange={(event) =>
                          setManualReference(event.target.value)
                        }
                        disabled={busy}
                      />
                    </label>
                  )}
                  {detail.refundId && detail.refundStatus !== 'failed' ? (
                    <Button
                      disabled={busy}
                      onClick={() => void mutate({ checkOnly: true }, true)}
                    >
                      Check refund status
                    </Button>
                  ) : (
                    <>
                      {!confirmRefund ? (
                        <Button
                          disabled={
                            busy ||
                            detail.order.paymentStatus !== 'PAID' ||
                            (isCod && manualReference.trim().length < 3)
                          }
                          onClick={() => setConfirmRefund(true)}
                        >
                          {detail.refundStartedAt
                            ? 'Retry same refund'
                            : 'Review refund'}
                        </Button>
                      ) : (
                        <div className="space-y-3 rounded-xl border border-amber-500/30 p-3">
                          <p className="text-sm text-amber-400">
                            Confirm {formatPrice(amount)} to the original
                            payment method. This financial action cannot be
                            undone once processed.
                          </p>
                          <Button
                            disabled={busy}
                            loading={busy}
                            onClick={() =>
                              void mutate(
                                {
                                  includeShipping:
                                    detail.refundAmount != null
                                      ? detail.refundAmount >
                                        detail.refundQuote.itemsAmount
                                      : includeShipping,
                                  manualReference: isCod
                                    ? manualReference.trim()
                                    : undefined,
                                },
                                true
                              )
                            }
                          >
                            Confirm refund
                          </Button>
                          <Button
                            variant="secondary"
                            disabled={busy}
                            onClick={() => setConfirmRefund(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                  {detail.refundStatus && (
                    <p className="text-xs text-repixl-muted">
                      Refund status: {detail.refundStatus}
                    </p>
                  )}
                </section>
              )}
              {detail.status === 'REFUNDED' && (
                <section className={panel}>
                  <h2 className="font-display text-lg text-emerald-400">
                    Refund complete
                  </h2>
                  <p className="mt-3 text-sm text-repixl-text-light">
                    {formatPrice(detail.refundAmount ?? detail.order.total)}
                  </p>
                  <p className="mt-2 break-all text-xs text-repixl-muted">
                    {detail.refundId}
                  </p>
                </section>
              )}
            </aside>
          </div>
        </>
      )}
      <ImageLightbox
        images={images.map((image, index) => ({
          src: image.signedUrl,
          alt: `Evidence ${index + 1}`,
        }))}
        activeIndex={activeImage}
        onClose={() => setActiveImage(null)}
        onNavigate={setActiveImage}
      />
    </div>
  )
}
