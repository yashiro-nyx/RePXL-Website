'use client'

import { useEffect, useState } from 'react'
import { ConditionBadge } from '@/components/ui'
import { StarRating } from './StarRating'
import { PriceRangeSlider } from './PriceRangeSlider'
import {
  RATING_OPTIONS,
  CONDITION_OPTIONS,
  normalizePriceAgainstBounds,
  type CatalogFilters,
  type MinRating,
  type PriceRange,
  type PriceBounds,
  type MegapixelBucket,
  type EraBucket,
} from '@/lib/catalog-filters'
import type { ConditionGrade } from '@/types'

export interface FilterSidebarProps {
  filters: CatalogFilters
  hasFilters: boolean
  bounds: PriceBounds
  conditionCounts: Record<ConditionGrade, number>
  ratingCounts: Record<MinRating, number>
  /** Megapixel buckets that actually contain products (empty ones are hidden). */
  megapixelOptions: MegapixelBucket[]
  megapixelCounts: Record<string, number>
  /** Release-era buckets that actually contain products (empty ones are hidden). */
  eraOptions: EraBucket[]
  eraCounts: Record<string, number>
  onToggleCondition: (c: ConditionGrade) => void
  onSetMinRating: (r: MinRating | null) => void
  onSetInStockOnly: (v: boolean) => void
  onToggleMegapixel: (id: string) => void
  onToggleEra: (id: string) => void
  /** Commits a validated price range (called by the Apply button only). */
  onApplyPrice: (price: PriceRange) => void
  onClearAll: () => void
}

const CHECKBOX =
  'h-4 w-4 rounded border-repixl-muted/40 bg-transparent text-repixl-red focus:ring-2 focus:ring-repixl-red/40 focus:ring-offset-0'
const RADIO =
  'h-4 w-4 border-repixl-muted/40 bg-transparent text-repixl-red focus:ring-2 focus:ring-repixl-red/40'

/** Section wrapper — a lightweight labeled group separated by a hairline, not a box. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-repixl-muted/10 pt-5">
      <h3 className="mb-3.5 font-mono text-[10px] uppercase tracking-[0.2em] text-repixl-muted/80">{title}</h3>
      {children}
    </section>
  )
}

function Count({ n }: { n: number }) {
  return <span className="ml-auto font-mono text-[11px] tabular-nums text-repixl-muted/60">{n}</span>
}

/**
 * The single filtering UI, reused verbatim by the desktop sidebar and the mobile
 * drawer so both surfaces behave identically. Price uses a draft (slider +
 * inputs) and only commits on Apply; every other control commits immediately.
 * Facet counts are supplied by the page from real catalog data.
 */
export function FilterSidebar({
  filters,
  hasFilters,
  bounds,
  conditionCounts,
  ratingCounts,
  megapixelOptions,
  megapixelCounts,
  eraOptions,
  eraCounts,
  onToggleCondition,
  onSetMinRating,
  onSetInStockOnly,
  onToggleMegapixel,
  onToggleEra,
  onApplyPrice,
  onClearAll,
}: FilterSidebarProps) {
  // Draft price [min,max] in real pesos. Starts from the applied range or the
  // full catalog bounds. Not applied to the grid until "Apply Price".
  const appliedMin = filters.price.min ?? bounds.min
  const appliedMax = filters.price.max ?? bounds.max
  const [draft, setDraft] = useState<[number, number]>([appliedMin, appliedMax])
  const [minText, setMinText] = useState(String(appliedMin))
  const [maxText, setMaxText] = useState(String(appliedMax))

  // Re-sync the draft when the applied range or catalog bounds change
  // elsewhere (Clear All, chip removal, catalog hydration).
  useEffect(() => {
    const lo = filters.price.min ?? bounds.min
    const hi = filters.price.max ?? bounds.max
    setDraft([lo, hi])
    setMinText(String(lo))
    setMaxText(String(hi))
  }, [filters.price.min, filters.price.max, bounds.min, bounds.max])

  // Slider drag → update draft + input text (draft only, no filtering yet).
  const onSliderChange = ([lo, hi]: [number, number]) => {
    setDraft([lo, hi])
    setMinText(String(lo))
    setMaxText(String(hi))
  }

  // Typing → update the text immediately; reconcile into the draft on blur/Enter.
  const commitMinText = () => {
    const n = Number(minText)
    const lo = Number.isFinite(n) ? Math.min(Math.max(bounds.min, n), draft[1]) : draft[0]
    setDraft([lo, draft[1]])
    setMinText(String(lo))
  }
  const commitMaxText = () => {
    const n = Number(maxText)
    const hi = Number.isFinite(n) ? Math.max(Math.min(bounds.max, n), draft[0]) : draft[1]
    setDraft([draft[0], hi])
    setMaxText(String(hi))
  }

  const applyPrice = () => {
    // Reconcile any unblurred text first, then normalize against bounds.
    const loN = Number(minText)
    const hiN = Number(maxText)
    const lo = Number.isFinite(loN) ? loN : draft[0]
    const hi = Number.isFinite(hiN) ? hiN : draft[1]
    const normalized = normalizePriceAgainstBounds({ min: lo, max: hi }, bounds)
    onApplyPrice(normalized)
  }

  return (
    <div className="space-y-5">
      {/* Header + Clear All */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-repixl-text-light">Filters</p>
        <button
          type="button"
          onClick={onClearAll}
          disabled={!hasFilters}
          className={[
            'rounded font-mono text-[10px] uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
            hasFilters ? 'text-repixl-red hover:text-red-400' : 'cursor-not-allowed text-repixl-muted/40',
          ].join(' ')}
        >
          Clear all
        </button>
      </div>

      {/* Availability */}
      <Section title="Availability">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/85 hover:text-repixl-text-light">
          <input type="checkbox" checked={filters.inStockOnly} onChange={(e) => onSetInStockOnly(e.target.checked)} className={CHECKBOX} />
          In stock
        </label>
      </Section>

      {/* Price range (slider + inputs + Apply) */}
      <Section title="Price range">
        {bounds.max > bounds.min ? (
          <>
            <PriceRangeSlider bounds={bounds} value={draft} onChange={onSliderChange} />
            <div className="mt-4 flex items-center gap-2">
              <label className="flex flex-1 items-center gap-1 rounded-lg border border-repixl-muted/20 bg-repixl-bg px-2.5 py-2">
                <span className="font-mono text-xs text-repixl-muted" aria-hidden="true">₱</span>
                <input
                  type="number" min={bounds.min} max={bounds.max} inputMode="numeric"
                  value={minText}
                  onChange={(e) => setMinText(e.target.value)}
                  onBlur={commitMinText}
                  onKeyDown={(e) => { if (e.key === 'Enter') { commitMinText(); applyPrice() } }}
                  aria-label="Minimum price"
                  className="w-full bg-transparent font-mono text-xs text-repixl-text-light focus:outline-none"
                />
              </label>
              <span className="text-repixl-muted" aria-hidden="true">–</span>
              <label className="flex flex-1 items-center gap-1 rounded-lg border border-repixl-muted/20 bg-repixl-bg px-2.5 py-2">
                <span className="font-mono text-xs text-repixl-muted" aria-hidden="true">₱</span>
                <input
                  type="number" min={bounds.min} max={bounds.max} inputMode="numeric"
                  value={maxText}
                  onChange={(e) => setMaxText(e.target.value)}
                  onBlur={commitMaxText}
                  onKeyDown={(e) => { if (e.key === 'Enter') { commitMaxText(); applyPrice() } }}
                  aria-label="Maximum price"
                  className="w-full bg-transparent font-mono text-xs text-repixl-text-light focus:outline-none"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={applyPrice}
              className="mt-3 w-full rounded-lg border border-repixl-muted/25 bg-repixl-charcoal py-2 font-mono text-[10px] uppercase tracking-wider text-repixl-text-light/85 transition-colors hover:border-repixl-red/50 hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
            >
              Apply Price
            </button>
          </>
        ) : (
          <p className="text-xs text-repixl-muted">Price filtering unavailable.</p>
        )}
      </Section>

      {/* Condition + counts */}
      <Section title="Condition">
        <ul className="space-y-2.5">
          {CONDITION_OPTIONS.map((condition) => (
            <li key={condition}>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input type="checkbox" checked={filters.conditions.includes(condition)} onChange={() => onToggleCondition(condition)} className={CHECKBOX} />
                <ConditionBadge condition={condition} />
                <Count n={conditionCounts[condition] ?? 0} />
              </label>
            </li>
          ))}
        </ul>
      </Section>

      {/* Customer rating (real data) + counts */}
      <Section title="Customer rating">
        <ul className="space-y-2.5">
          {RATING_OPTIONS.map((stars) => (
            <li key={stars}>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/85 hover:text-repixl-text-light">
                <input type="radio" name="min-rating" checked={filters.minRating === stars} onChange={() => onSetMinRating(stars)} className={RADIO} />
                <span className="inline-flex items-center gap-1.5">
                  <StarRating value={stars} />
                  <span className="text-xs">&amp; up</span>
                </span>
                <Count n={ratingCounts[stars] ?? 0} />
              </label>
            </li>
          ))}
          <li>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/70 hover:text-repixl-text-light">
              <input type="radio" name="min-rating" checked={filters.minRating === null} onChange={() => onSetMinRating(null)} className={RADIO} />
              <span className="text-xs">Any rating</span>
            </label>
          </li>
        </ul>
      </Section>

      {/* Resolution (megapixels) — real specs.megapixels; empty bands hidden */}
      {megapixelOptions.length > 0 && (
        <Section title="Resolution">
          <ul className="space-y-2.5">
            {megapixelOptions.map((bucket) => (
              <li key={bucket.id}>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/85 hover:text-repixl-text-light">
                  <input type="checkbox" checked={filters.megapixels.includes(bucket.id)} onChange={() => onToggleMegapixel(bucket.id)} className={CHECKBOX} />
                  {bucket.label}
                  <Count n={megapixelCounts[bucket.id] ?? 0} />
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Release era — real specs.year; empty bands hidden */}
      {eraOptions.length > 0 && (
        <Section title="Release era">
          <ul className="space-y-2.5">
            {eraOptions.map((bucket) => (
              <li key={bucket.id}>
                <label className="flex cursor-pointer items-center gap-2.5 text-sm text-repixl-text-light/85 hover:text-repixl-text-light">
                  <input type="checkbox" checked={filters.eras.includes(bucket.id)} onChange={() => onToggleEra(bucket.id)} className={CHECKBOX} />
                  {bucket.label}
                  <Count n={eraCounts[bucket.id] ?? 0} />
                </label>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  )
}
