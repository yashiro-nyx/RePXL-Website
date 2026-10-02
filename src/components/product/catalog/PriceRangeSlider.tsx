'use client'

import { useCallback, useId, useMemo } from 'react'
import { formatPriceCompact } from '@/lib/format'
import type { PriceBounds } from '@/lib/catalog-filters'

/**
 * Accessible dual-handle price range slider (dependency-free).
 *
 * Implementation: two overlaid native <input type="range"> elements provide
 * real keyboard/touch/screen-reader behavior for free (arrow keys, aria-value*,
 * focus), while a custom track + active segment gives it RePXL's look. The two
 * handles are prevented from crossing by clamping each against the other on
 * change. Pointer events are routed to whichever handle is nearer so the whole
 * track is draggable even where the inputs overlap.
 *
 * This control is DRAFT-only: it reports value changes via onChange, but the
 * catalog is not refiltered until the parent's "Apply Price" commits the draft.
 */
export function PriceRangeSlider({
  bounds,
  value,
  onChange,
}: {
  bounds: PriceBounds
  /** Current DRAFT [min, max] in pesos (already within bounds). */
  value: [number, number]
  onChange: (next: [number, number]) => void
}) {
  const id = useId()
  const [min, max] = value
  const span = Math.max(1, bounds.max - bounds.min)
  const step = useMemo(() => {
    // 100 steps across the range, at least 1 peso.
    return Math.max(1, Math.round(span / 100))
  }, [span])

  const pct = useCallback((v: number) => ((v - bounds.min) / span) * 100, [bounds.min, span])
  const minPct = pct(min)
  const maxPct = pct(max)

  const setMin = (raw: number) => {
    const clamped = Math.min(raw, max) // never cross the max handle
    onChange([Math.max(bounds.min, clamped), max])
  }
  const setMax = (raw: number) => {
    const clamped = Math.max(raw, min) // never cross the min handle
    onChange([min, Math.min(bounds.max, clamped)])
  }

  // Route pointer interaction to the nearer handle so overlapping inputs don't
  // trap the max handle when both sit at the same spot.
  const minZ = minPct > 100 - maxPct ? 5 : 4

  return (
    <div className="pt-1">
      {/* Bound labels */}
      <div className="mb-2 flex items-center justify-between font-mono text-[11px] text-repixl-muted">
        <span>{formatPriceCompact(bounds.min)}</span>
        <span>{formatPriceCompact(bounds.max)}</span>
      </div>

      {/* Track + handles */}
      <div className="relative h-6">
        {/* Inactive track */}
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-repixl-muted/25" aria-hidden="true" />
        {/* Active segment */}
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-repixl-red"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
          aria-hidden="true"
        />

        {/* Min range input */}
        <input
          type="range"
          id={`${id}-min`}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
          style={{ zIndex: minZ }}
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={min}
          onChange={(e) => setMin(Number(e.target.value))}
          aria-label="Minimum price"
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          aria-valuenow={min}
          aria-valuetext={formatPriceCompact(min)}
        />
        {/* Max range input */}
        <input
          type="range"
          id={`${id}-max`}
          className="range-thumb pointer-events-none absolute inset-x-0 top-0 h-6 w-full appearance-none bg-transparent"
          style={{ zIndex: 5 }}
          min={bounds.min}
          max={bounds.max}
          step={step}
          value={max}
          onChange={(e) => setMax(Number(e.target.value))}
          aria-label="Maximum price"
          aria-valuemin={bounds.min}
          aria-valuemax={bounds.max}
          aria-valuenow={max}
          aria-valuetext={formatPriceCompact(max)}
        />
      </div>
    </div>
  )
}
