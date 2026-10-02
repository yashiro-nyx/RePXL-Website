'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Button,
  PageBackLink,
  PageLoader,
  ImageUploader,
  type UploadedImage,
} from '@/components/ui'
import { ReturnProgress } from '@/components/account/ReturnProgress'
import { useAuthStore } from '@/stores/authStore'
import { REASON_OPTIONS, requiresEvidence } from '@/lib/returnReasons'
import {
  calculateReturnQuote,
  type ReturnWorkflow,
} from '@/lib/return-workflow'
import { formatPrice } from '@/lib/format'
import {
  toUserMessageFromResponse,
  getFieldErrors,
  type ApiErrorBody,
} from '@/lib/errors/client-errors'

interface ReturnOrder {
  orderNumber: string
  status: string
  paymentStatus: string
  paymentMethod: string
  deliveredAt: string | null
  completedAt: string | null
  total: number
  discount: number
  shippingCost: number
  items: {
    id: string
    price: number
    quantity: number
    product: { name: string }
  }[]
}

interface CustomerReturn extends ReturnWorkflow {
  id: string
  reason: string
  items: { orderItemId: string; quantity: number }[]
  refundQuote?: ReturnType<typeof calculateReturnQuote>
}

const panel = 'rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-5'
const inputClass =
  'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-3 text-sm text-repixl-text-light focus:outline-none focus:ring-2 focus:ring-repixl-red/40'

export default function ReturnRequestPage() {
  const { orderNumber } = useParams<{ orderNumber: string }>()
  const router = useRouter()
  const { hydrate } = useAuthStore()
  const [order, setOrder] = useState<ReturnOrder | null>(null)
  const [request, setRequest] = useState<CustomerReturn | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<{ details?: string }>({})
  const [step, setStep] = useState(1)
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [carrier, setCarrier] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [notice, setNotice] = useState('')
  const actionLock = useRef(false)

  const load = useCallback(async () => {
    try {
      setError('')
      const [orderRes, returnRes] = await Promise.all([
        fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
        fetch(`/api/returns/${encodeURIComponent(orderNumber)}`, {
          credentials: 'include',
          cache: 'no-store',
        }),
      ])
      const [orderBody, returnBody] = await Promise.all([
        orderRes.json().catch(() => null),
        returnRes.json().catch(() => null),
      ])
      if (!orderRes.ok) {
        throw new Error(toUserMessageFromResponse(orderRes, orderBody))
      }
      if (
        !returnRes.ok &&
        !(
          returnRes.status === 404 &&
          returnBody?.error === 'No return request found for this order'
        )
      ) {
        throw new Error(toUserMessageFromResponse(returnRes, returnBody))
      }
      setOrder(orderBody.data)
      setRequest(returnRes.ok ? returnBody.data : null)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load return details.'
      )
    } finally {
      setLoading(false)
    }
  }, [orderNumber])

  useEffect(() => {
    void hydrate().then(() => {
      if (!useAuthStore.getState().isLoggedIn) {
        router.replace('/login')
        return
      }
      void load()
    })
  }, [hydrate, load, router])

  useEffect(() => {
    if (
      !request ||
      request.status === 'REJECTED' ||
      request.status === 'REFUNDED'
    )
      return
    const sync = () => {
      if (document.visibilityState === 'visible' && !actionLock.current)
        void load()
    }
    const timer = setInterval(sync, 15000)
    window.addEventListener('focus', sync)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', sync)
    }
  }, [load, request?.id, request?.status])

  const date =
    order?.status === 'DELIVERED'
      ? order.deliveredAt
      : order?.status === 'COMPLETED'
        ? order.completedAt
        : null
  const elapsed = date ? Date.now() - new Date(date).getTime() : NaN
  const eligible =
    elapsed >= 0 &&
    elapsed <= 30 * 86400000 &&
    order?.paymentStatus !== 'REFUNDED'
  const evidenceRequired = requiresEvidence(reason)
  const selected =
    order?.items.filter((item) => selectedItems.includes(item.id)) ?? []
  const quote =
    order && selected.length
      ? calculateReturnQuote(
          order,
          selected.map((item) => ({
            orderItemId: item.id,
            quantity: item.quantity,
          }))
        )
      : null
  const uploaded = images.filter((image) => image.uploaded)
  const uploading = images.some((image) => !image.uploaded)

  const validate = () => {
    if (!selectedItems.length) return 'Select at least one item to return.'
    if (!reason) return 'Choose a reason for your return.'
    if (evidenceRequired && !uploaded.length)
      return 'Upload at least one clear photo for this reason.'
    if (uploading) return 'Please wait for all photos to finish uploading.'
    if (
      details.trim() &&
      details.trim().length < 10
    ) {
      setErrors((prev) => ({
        ...prev,
        details: 'Please add a little more detail — at least 10 characters.',
      }))
      return 'Please describe the issue in at least 10 characters.'
    }
    if (details.trim().length > 1000) {
      return 'Please keep your description under 1000 characters.'
    }
    return ''
  }

  const next = () => {
    const message =
      step === 1
        ? !selectedItems.length
          ? 'Select at least one item to return.'
          : ''
        : validate()
    setError(message)
    if (!message) setStep((value) => value + 1)
  }

  const submit = async () => {
    if (actionLock.current) return
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }
    actionLock.current = true
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderNumber,
          selectedItemIds: selectedItems,
          reason,
          details: details.trim() || undefined,
          imagePublicIds: uploaded.map((image) => image.publicId),
        }),
      })
      const body: ApiErrorBody | null = await res.json().catch(() => null)
      if (!res.ok) {
        const serverFieldErrors = getFieldErrors(body)
        if (serverFieldErrors.details) {
          setErrors((prev) => ({ ...prev, details: serverFieldErrors.details }))
        }
        setError(toUserMessageFromResponse(res, body))
        return
      }
      setRequest((body as any)?.data)
      setRetrying(false)
      setImages([])
      setNotice(
        'Your request has been received. Wait for approval and return instructions before sending any items.'
      )
      await load()
    } catch {
      setError(
        'We couldn’t submit your return request. Please check your connection and try again.'
      )
    } finally {
      actionLock.current = false
      setSubmitting(false)
    }
  }

  const saveTracking = async (event: React.FormEvent) => {
    event.preventDefault()
    if (actionLock.current || !request) return
    actionLock.current = true
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(
        `/api/returns/${encodeURIComponent(orderNumber)}`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            returnRequestId: request.id,
            returnCarrier: carrier.trim(),
            returnTrackingNumber: trackingNumber.trim(),
          }),
        }
      )
      const body: ApiErrorBody | null = await res.json().catch(() => null)
      if (!res.ok) {
        setError(toUserMessageFromResponse(res, body))
        return
      }
      setNotice(
        'Return tracking saved. Our team will update this page when the items arrive.'
      )
      await load()
    } catch {
      setError('Unable to save tracking. Please try again.')
    } finally {
      actionLock.current = false
      setSubmitting(false)
    }
  }

  if (loading) return <PageLoader label="Loading return details..." />

  return (
    <div className="space-y-6">
      <PageBackLink href={`/account/orders/${orderNumber}`} label="Order" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-repixl-muted">{orderNumber}</p>
          <h1 className="mt-2 font-display text-display-md text-repixl-text-light">
            Returns & Refunds
          </h1>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void load()}
          disabled={submitting}
        >
          Refresh status
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="mt-0.5 flex-shrink-0 text-red-400"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-400"
        >
          {notice}
        </p>
      )}

      {!order ? (
        <p className="text-repixl-muted">
          Unable to load this order. Use Refresh status to try again.
        </p>
      ) : request && !retrying ? (
        <>
          <ReturnProgress request={request} />
          <div className="grid gap-5 lg:grid-cols-2">
            <section className={panel}>
              <h2 className="font-display text-lg text-repixl-text-light">
                Your return request
              </h2>
              <p className="mt-2 font-mono text-xs text-repixl-muted">
                Case #{request.id.slice(-8).toUpperCase()}
              </p>
              <p className="mt-4 whitespace-pre-wrap text-sm text-repixl-text-light">
                {request.reason}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-repixl-muted">
                {order.items
                  .filter(
                    (item) =>
                      !request.items?.length ||
                      request.items.some(
                        (entry) => entry.orderItemId === item.id
                      )
                  )
                  .map((item) => (
                    <li key={item.id}>
                      {item.product.name} /{' '}
                      {request.items?.find(
                        (entry) => entry.orderItemId === item.id
                      )?.quantity ?? item.quantity}
                    </li>
                  ))}
              </ul>
              <p className="mt-4 text-sm text-repixl-text-light">
                {request.refundAmount != null
                  ? 'Refund amount'
                  : 'Estimated item refund'}
                :{' '}
                {formatPrice(
                  request.refundAmount ?? request.refundQuote?.itemsAmount ?? 0
                )}
              </p>
              <p className="mt-1 text-xs text-repixl-muted">
                {order.paymentMethod}. Refunds follow the original payment
                method; bank/provider posting times vary.
              </p>
              {request.refundId && (
                <p className="mt-3 break-all font-mono text-xs text-repixl-muted">
                  Refund reference: {request.refundId.replace(/^manual:/, '')}
                </p>
              )}
              {request.refundStatus === 'unknown' && (
                <p className="mt-3 text-sm text-amber-400">
                  Our team is confirming the payment provider's response. Your
                  refund is not yet marked complete.
                </p>
              )}
            </section>
            <section className={panel}>
              <h2 className="font-display text-lg text-repixl-text-light">
                What happens next
              </h2>
              {['REQUESTED', 'UNDER_REVIEW'].includes(request.status) && (
                <p className="mt-3 text-sm text-repixl-muted">
                  Our team will review your reason and evidence. Please keep the
                  camera, accessories, and packaging together. Wait for approval
                  before returning them.
                </p>
              )}
              {request.status === 'APPROVED' && (
                <>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-repixl-text-light">
                    {request.returnInstructions ||
                      'Our team will provide return instructions. Contact support before shipping.'}
                  </p>
                  <p className="mt-3 text-xs text-repixl-muted">
                    Pack items securely, include your order/case reference, and
                    follow the provided shipping or pickup instructions. Items
                    are inspected before a refund is issued.
                  </p>
                </>
              )}
              {request.status === 'REFUNDED' && (
                <p className="mt-3 text-sm text-emerald-400">
                  Your refund has been processed. Allow your original payment
                  provider to post the credit. Contact support with the
                  reference above if it has not arrived.
                </p>
              )}
              {request.status === 'REJECTED' && (
                <>
                  <p className="mt-3 text-sm text-repixl-muted">
                    Review the decision above or contact support with your case
                    reference.
                  </p>
                  {eligible && (
                    <Button
                      className="mt-4"
                      variant="secondary"
                      onClick={() => {
                        setRetrying(true)
                        setStep(1)
                        setError('')
                        setNotice('')
                      }}
                    >
                      Submit a revised request
                    </Button>
                  )}
                </>
              )}
              <Link
                className="mt-4 inline-block text-sm text-repixl-red hover:underline"
                href="/contact"
              >
                Contact support
              </Link>
            </section>
          </div>
          {request.returnTrackingNumber && (
            <div className={panel}>
              <p className="text-sm text-repixl-text-light">
                Return shipment: {request.returnCarrier} /{' '}
                {request.returnTrackingNumber}
              </p>
            </div>
          )}
          {request.status === 'APPROVED' &&
            !request.receivedAt &&
            !request.refundStartedAt && (
              <form onSubmit={saveTracking} className={`${panel} space-y-4`}>
                <h2 className="font-display text-lg text-repixl-text-light">
                  Sent your return?
                </h2>
                <p className="text-sm text-repixl-muted">
                  Add the courier and tracking reference from your return
                  shipment. For a pickup, follow the team's instructions.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="space-y-2 text-sm text-repixl-muted">
                    <span>Return courier</span>
                    <input
                      className={inputClass}
                      value={carrier}
                      onChange={(event) => setCarrier(event.target.value)}
                      required
                      minLength={2}
                      maxLength={100}
                      disabled={submitting}
                    />
                  </label>
                  <label className="space-y-2 text-sm text-repixl-muted">
                    <span>Tracking number</span>
                    <input
                      className={inputClass}
                      value={trackingNumber}
                      onChange={(event) =>
                        setTrackingNumber(event.target.value)
                      }
                      required
                      minLength={3}
                      maxLength={150}
                      disabled={submitting}
                    />
                  </label>
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  loading={submitting}
                >
                  Save return tracking
                </Button>
              </form>
            )}
        </>
      ) : !eligible ? (
        <section className={panel}>
          <h2 className="font-display text-lg text-repixl-text-light">
            This order is not eligible for a new return
          </h2>
          <p className="mt-3 text-sm text-repixl-muted">
            Requests are accepted within 30 days of delivery or completion.
            Already-refunded orders cannot be returned again. Contact support if
            you need help.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block text-sm text-repixl-red"
          >
            Contact support
          </Link>
        </section>
      ) : (
        <>
          <ol
            aria-label="Return request steps"
            className="grid grid-cols-3 gap-2"
          >
            {['Select items', 'Reason & photos', 'Review request'].map(
              (label, index) => (
                <li
                  key={label}
                  aria-current={step === index + 1 ? 'step' : undefined}
                  className={`rounded-xl border p-3 text-xs sm:text-sm ${step === index + 1 ? 'border-repixl-red/50 bg-repixl-red/10 text-repixl-text-light' : 'border-repixl-muted/15 text-repixl-muted'}`}
                >
                  {index + 1}. {label}
                </li>
              )
            )}
          </ol>
          <p className="text-sm text-repixl-muted">
            Request within 30 days of delivery or completion. We'll review it,
            provide return instructions, and inspect the returned items before
            issuing a refund.
          </p>
          {step === 1 && (
            <section className={`${panel} space-y-3`}>
              <h2 className="font-display text-lg text-repixl-text-light">
                Select the items to return
              </h2>
              {order.items.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-repixl-muted/15 p-4"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600"
                    checked={selectedItems.includes(item.id)}
                    onChange={() =>
                      setSelectedItems((values) =>
                        values.includes(item.id)
                          ? values.filter((value) => value !== item.id)
                          : [...values, item.id]
                      )
                    }
                  />
                  <span className="flex-1 text-sm text-repixl-text-light">
                    {item.product.name}
                    <span className="mt-1 block text-xs text-repixl-muted">
                      Quantity: {item.quantity}
                    </span>
                  </span>
                  <span className="text-sm text-repixl-muted">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </label>
              ))}
            </section>
          )}
          {step === 2 && (
            <div className="space-y-5">
              <fieldset className={`${panel} space-y-3`}>
                <legend className="font-display text-lg text-repixl-text-light">
                  Why are you returning these items?
                </legend>
                {REASON_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-repixl-muted/15 p-3"
                  >
                    <input
                      type="radio"
                      name="return-reason"
                      value={option.value}
                      checked={reason === option.value}
                      onChange={() => setReason(option.value)}
                      className="accent-red-600"
                    />
                    <span className="flex-1 text-sm text-repixl-text-light">
                      {option.label}
                    </span>
                    {option.evidenceRequired && (
                      <span className="text-[10px] text-amber-400">
                        Photo required
                      </span>
                    )}
                  </label>
                ))}
              </fieldset>
              <section className={`${panel} space-y-3`}>
                <label
                  htmlFor="return-details"
                  className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-repixl-muted"
                >
                  Describe the issue <span className="text-repixl-text-light/40">(Optional)</span>
                </label>
                <p id="return-details-help" className="mb-2 text-xs text-repixl-muted">
                  Tell us what happened and describe the condition of the item. If you add details, please use at least 10 characters.
                </p>
                <textarea
                  id="return-details"
                  rows={4}
                  maxLength={1000}
                  className={`w-full resize-y rounded-xl border bg-repixl-bg px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:outline-none ${errors.details ? 'border-red-400/60 focus:border-red-400' : 'border-repixl-muted/20 focus:border-repixl-muted/40'}`}
                  value={details}
                  onChange={(event) => {
                    setDetails(event.target.value)
                    if (errors.details) {
                      setErrors((prev) => ({ ...prev, details: undefined }))
                    }
                  }}
                  placeholder="For example: The lens has visible fungus that wasn’t in the listing photos."
                  aria-invalid={errors.details ? true : undefined}
                  aria-describedby={errors.details ? 'return-details-help return-details-error' : 'return-details-help'}
                />
                <div className="flex items-center justify-between">
                  {errors.details && (
                    <p id="return-details-error" className="flex items-center gap-1.5 text-xs text-red-400" role="alert">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="flex-shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
                      {errors.details}
                    </p>
                  )}
                  <p className="ml-auto text-xs text-repixl-muted">
                    {details.length}/1000
                  </p>
                </div>
                <ImageUploader
                  images={images}
                  onChange={setImages}
                  uploadEndpoint="/api/upload/return-image"
                  deleteEndpoint="/api/upload/return-image"
                  maxImages={5}
                  required={evidenceRequired}
                  label="Photo Evidence"
                  hint={
                    evidenceRequired
                      ? 'Please upload clear photos showing the issue with the item. Up to 5 photos — JPG, PNG, or WebP, max 5 MB each.'
                      : 'Optional. Add photos to help us review your request. Up to 5 photos — JPG, PNG, or WebP, max 5 MB each.'
                  }
                />
              </section>
            </div>
          )}
          {step === 3 && (
            <section className={`${panel} space-y-4`}>
              <h2 className="font-display text-lg text-repixl-text-light">
                Review your request
              </h2>
              <ul className="space-y-2 text-sm text-repixl-text-light">
                {selected.map((item) => (
                  <li key={item.id}>
                    {item.product.name} / {item.quantity}
                  </li>
                ))}
              </ul>
              <p className="text-sm text-repixl-text-light">
                Reason:{' '}
                {
                  REASON_OPTIONS.find((option) => option.value === reason)
                    ?.label
                }
              </p>
              {details.trim() && (
                <p className="whitespace-pre-wrap text-sm text-repixl-muted">
                  {details.trim()}
                </p>
              )}
              <p className="text-sm text-repixl-muted">
                {uploaded.length} evidence photo(s) attached
              </p>
              <p className="text-lg text-repixl-text-light">
                Estimated item refund: {formatPrice(quote?.itemsAmount ?? 0)}
              </p>
              <p className="text-xs text-repixl-muted">
                The estimate includes your item discount share. Original
                shipping is reviewed separately for whole-order returns.
                Approval and inspection are required. Refunds use the original
                payment method; COD repayments are arranged by our team.
              </p>
            </section>
          )}
          <div className="flex flex-wrap gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                disabled={submitting}
                onClick={() => {
                  setStep((value) => value - 1)
                  setError('')
                }}
              >
                Back
              </Button>
            )}
            {step < 3 ? (
              <Button onClick={next} disabled={uploading}>
                Continue
              </Button>
            ) : (
              <Button
                onClick={() => void submit()}
                disabled={submitting || uploading}
                loading={submitting}
              >
                Submit return request
              </Button>
            )}
            <Link href={`/account/orders/${orderNumber}`}>
              <Button variant="secondary" disabled={submitting}>
                Back to Order
              </Button>
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
