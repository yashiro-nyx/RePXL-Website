'use client'

import { formatPriceCompact } from '@/lib/format'
import { megapixelLabel, eraLabel, type CatalogFilters, type MinRating, type PriceRange } from '@/lib/catalog-filters'
import type { ConditionGrade } from '@/types'

export interface ActiveFilterChipsProps {
  filters: CatalogFilters
  /** Clears the (single, centralized) brand selection. */
  onRemoveBrand: (brand: string) => void
  onRemoveCondition: (c: ConditionGrade) => void
  onRemovePrice: () => void
  onRemoveRating: () => void
  onRemoveInStock: () => void
  onRemoveMegapixel: (id: string) => void
  onRemoveEra: (id: string) => void
  onClearAll: () => void
}

function priceLabel(price: PriceRange): string {
  const { min, max } = price
  if (min !== null && max !== null) return `${formatPriceCompact(min)}–${formatPriceCompact(max)}`
  if (min !== null) return `${formatPriceCompact(min)} & up`
  if (max !== null) return `Up to ${formatPriceCompact(max)}`
  return ''
}

function ratingLabel(min: MinRating): string {
  return `${min}★ & up`
}

/**
 * Compact row of removable chips summarizing the active filters. Hidden when no
 * filters are active. Each chip removes just that filter; a trailing "Clear all"
 * removes them all. This makes it obvious why certain cameras are shown.
 */
export function ActiveFilterChips({
  filters,
  onRemoveBrand,
  onRemoveCondition,
  onRemovePrice,
  onRemoveRating,
  onRemoveInStock,
  onRemoveMegapixel,
  onRemoveEra,
  onClearAll,
}: ActiveFilterChipsProps) {
  const chips: { key: string; label: string; onRemove: () => void }[] = []

  filters.brands.forEach((b) => chips.push({ key: `brand-${b}`, label: b, onRemove: () => onRemoveBrand(b) }))
  filters.conditions.forEach((c) =>
    chips.push({ key: `cond-${c}`, label: c.charAt(0).toUpperCase() + c.slice(1), onRemove: () => onRemoveCondition(c) })
  )
  if (filters.price.min !== null || filters.price.max !== null) {
    chips.push({ key: 'price', label: priceLabel(filters.price), onRemove: onRemovePrice })
  }
  if (filters.minRating !== null) {
    chips.push({ key: 'rating', label: ratingLabel(filters.minRating), onRemove: onRemoveRating })
  }
  if (filters.inStockOnly) {
    chips.push({ key: 'stock', label: 'In stock', onRemove: onRemoveInStock })
  }
  filters.megapixels.forEach((id) =>
    chips.push({ key: `mp-${id}`, label: megapixelLabel(id), onRemove: () => onRemoveMegapixel(id) })
  )
  filters.eras.forEach((id) =>
    chips.push({ key: `era-${id}`, label: eraLabel(id), onRemove: () => onRemoveEra(id) })
  )

  if (chips.length === 0) return null

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-1.5 rounded-full border border-repixl-muted/25 bg-repixl-charcoal px-3 py-1 text-xs text-repixl-text-light/85 transition-colors hover:border-repixl-red/50 hover:text-repixl-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
          aria-label={`Remove filter: ${chip.label}`}
        >
          {chip.label}
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted underline-offset-2 transition-colors hover:text-repixl-red hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 rounded"
      >
        Clear all
      </button>
    </div>
  )
}
