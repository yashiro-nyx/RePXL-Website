'use client'

/**
 * TrackingTimeline — real-time order tracking via Server-Sent Events.
 *
 * Connects to /api/track/stream?tracking=<trackingNumber> and updates
 * the four-milestone timeline as the SSE stream pushes status changes.
 */

import { useEffect, useState } from 'react'

const MILESTONES = [
  { key: 'Order Placed',      progress: 25,  label: 'Order Placed',      desc: 'Your order has been received and payment confirmed.' },
  { key: 'In Transit',        progress: 50,  label: 'In Transit',        desc: 'Your package is on its way.' },
  { key: 'Out for Delivery',  progress: 75,  label: 'Out for Delivery',  desc: 'Your package will arrive today.' },
  { key: 'Delivered',         progress: 100, label: 'Delivered',         desc: 'Package delivered successfully.' },
]

interface TrackingState {
  status: string
  progress: number
  description: string
}

interface TrackingTimelineProps {
  trackingNumber: string
  /** Initial snapshot from server — prevents blank flash before SSE connects */
  initialState?: TrackingState
}

export function TrackingTimeline({ trackingNumber, initialState }: TrackingTimelineProps) {
  const [state, setState] = useState<TrackingState>(
    initialState ?? { status: 'Order Placed', progress: 25, description: 'We are preparing your order.' }
  )
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!trackingNumber) return

    let es: EventSource
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    const MAX_RETRIES = 5

    const connect = () => {
      es = new EventSource(`/api/track/stream?tracking=${encodeURIComponent(trackingNumber)}`)

      es.onopen = () => { setConnected(true); setError(false); retryCount = 0 }

      es.onmessage = (event) => {
        try {
          const data: TrackingState = JSON.parse(event.data)
          setState(data)
        } catch {
          // Ignore malformed events
        }
      }

      es.onerror = () => {
        setConnected(false)
        es.close()
        if (retryCount < MAX_RETRIES) {
          retryCount += 1
          // Exponential back-off: 2s, 4s, 8s … capped at 30s
          const delay = Math.min(2000 * Math.pow(2, retryCount - 1), 30000)
          reconnectTimer = setTimeout(connect, delay)
        } else {
          setError(true)
        }
      }
    }

    connect()

    return () => {
      es?.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [trackingNumber])

  return (
    <div className="rounded-2xl border border-repixl-muted/10 bg-repixl-charcoal p-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Tracking</p>
          <p className="mt-0.5 font-mono text-xs font-semibold text-repixl-text-light">{trackingNumber}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'animate-pulse bg-repixl-success' : error ? 'bg-repixl-red' : 'bg-repixl-muted/40'}`}
            aria-hidden="true"
          />
          <span className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">
            {connected ? 'Live' : error ? 'Offline' : 'Connecting…'}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-repixl-muted/15">
        <div
          className="h-full rounded-full bg-repixl-red transition-all duration-700 ease-out"
          style={{ width: `${state.progress}%` }}
          role="progressbar"
          aria-valuenow={state.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Delivery progress"
        />
      </div>

      {/* Milestone steps */}
      <div className="relative flex items-start justify-between">
        {/* Connector line */}
        <div className="absolute left-0 right-0 top-4 h-px bg-repixl-muted/15" aria-hidden="true" />

        {MILESTONES.map((m, i) => {
          const reached = state.progress >= m.progress
          // A milestone is "current" only when it is the highest reached one
          // and the order is not yet at 100% progress.
          // Finding the last reached milestone avoids the bug where step 1
          // always glows red (because 25 > 0 is always true).
          const lastReachedIndex = [...MILESTONES]
            .reverse()
            .findIndex((ms) => state.progress >= ms.progress)
          const reversedIdx = lastReachedIndex === -1 ? -1 : MILESTONES.length - 1 - lastReachedIndex
          const isCurrent = i === reversedIdx && state.progress < 100

          return (
            <div key={m.key} className="relative flex flex-col items-center gap-2 text-center" style={{ flex: 1 }}>
              {/* Step circle */}
              <div
                className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 ${
                  reached
                    ? isCurrent && state.progress < 100
                      ? 'border-repixl-red bg-repixl-red text-white shadow-[0_0_12px_rgba(194,44,44,0.4)]'
                      : 'border-repixl-success bg-repixl-success/20 text-repixl-success'
                    : 'border-repixl-muted/30 bg-repixl-bg text-repixl-muted/40'
                }`}
              >
                {reached && !(isCurrent && state.progress < 100) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  <span className="font-mono text-[10px] font-bold">{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <p className={`font-mono text-[9px] uppercase tracking-wider transition-colors duration-300 ${
                reached ? (isCurrent && state.progress < 100 ? 'text-repixl-red' : 'text-repixl-success') : 'text-repixl-muted/50'
              }`}>
                {m.label}
              </p>
            </div>
          )
        })}
      </div>

      {/* Current status description */}
      <div className="mt-5 rounded-xl border border-repixl-muted/10 bg-repixl-bg/40 px-4 py-3">
        <p className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted">Status</p>
        <p className="mt-1 text-sm font-medium text-repixl-text-light">{state.status}</p>
        <p className="mt-0.5 text-xs text-repixl-muted/80">{state.description}</p>
      </div>
    </div>
  )
}
