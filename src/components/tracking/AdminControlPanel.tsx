'use client'

/**
 * AdminControlPanel — developer/admin tool for simulating shipping webhook events.
 * Only shown to admin users (caller must gate on role).
 */

import { useState } from 'react'

interface AdminControlPanelProps {
  trackingNumber: string
}

const STEPS: { key: string; label: string; description: string; icon: string }[] = [
  {
    key: 'transit',
    label: 'Mark In Transit',
    description: 'Simulates a warehouse departure scan (IT)',
    icon: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  },
  {
    key: 'out_for_delivery',
    label: 'Out for Delivery',
    description: 'Simulates a local courier hub scan (OD)',
    icon: 'M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3M9 11h14v10H9zM12 21h0M20 21h0',
  },
  {
    key: 'delivered',
    label: 'Mark Delivered',
    description: 'Simulates a final delivery confirmation (DE)',
    icon: 'M20 6 9 17l-5-5',
  },
]

export function AdminControlPanel({ trackingNumber }: AdminControlPanelProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  const simulate = async (step: string) => {
    setLoading(step)
    setResult(null)
    try {
      const res = await fetch('/api/admin/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackingNumber, step }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      setResult({
        ok: res.ok,
        message: res.ok
          ? `✓ Webhook fired: ${data.status_code} → ${step.replace(/_/g, ' ')}`
          : `✗ Error: ${data.error ?? 'Unknown error'}`,
      })
    } catch (err) {
      setResult({ ok: false, message: `✗ Network error: ${err instanceof Error ? err.message : String(err)}` })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" aria-hidden="true">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-amber-400/80">Admin — Dev Only</p>
          <p className="text-xs font-medium text-repixl-text-light/80">Simulate Shipping Events</p>
        </div>
      </div>

      <p className="mb-4 font-mono text-[9px] text-repixl-muted/70">
        Tracking: <span className="text-amber-400/80">{trackingNumber}</span>
      </p>

      {/* Step buttons */}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {STEPS.map((step) => (
          <button
            key={step.key}
            type="button"
            onClick={() => void simulate(step.key)}
            disabled={!!loading}
            className="flex flex-col items-start gap-1.5 rounded-xl border border-repixl-muted/15 bg-repixl-charcoal px-4 py-3 text-left transition-all hover:border-amber-500/30 hover:bg-amber-500/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/15">
                {loading === step.key ? (
                  <svg className="h-3 w-3 animate-spin text-amber-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" aria-hidden="true">
                    <path d={step.icon} />
                  </svg>
                )}
              </div>
            </div>
            <p className="text-xs font-semibold text-repixl-text-light">{step.label}</p>
            <p className="font-mono text-[9px] text-repixl-muted/60">{step.description}</p>
          </button>
        ))}
      </div>

      {/* Result feedback */}
      {result && (
        <div className={`mt-3 rounded-lg px-3 py-2 font-mono text-[10px] ${
          result.ok
            ? 'border border-repixl-success/20 bg-repixl-success/10 text-repixl-success'
            : 'border border-red-500/20 bg-red-500/10 text-red-400'
        }`}>
          {result.message}
        </div>
      )}
    </div>
  )
}
