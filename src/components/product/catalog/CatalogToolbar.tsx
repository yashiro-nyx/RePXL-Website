'use client'

import { SortListbox } from './SortListbox'
import type { SortOption } from '@/lib/catalog-filters'

/**
 * Toolbar connecting the filters and the grid: result count on the left, a
 * custom RePXL Sort listbox on the right, and (under lg) a Filters button that
 * opens the mobile drawer.
 */
export function CatalogToolbar({
  count,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount,
}: {
  count: number
  sort: SortOption
  onSortChange: (s: SortOption) => void
  onOpenFilters: () => void
  activeFilterCount: number
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-3 border-b border-repixl-muted/10 pb-2">
      <div className="flex items-center gap-3">
        {/* Mobile: open filter drawer */}
        <button
          type="button"
          onClick={onOpenFilters}
          className="repixl-control flex min-h-11 items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm transition-colors hover:border-repixl-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 lg:hidden"
          aria-label="Open filters"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" x2="20" y1="6" y2="6" /><line x1="8" x2="16" y1="12" y2="12" /><line x1="12" x2="12" y1="18" y2="18" /></svg>
          <span className="hidden sm:inline">Filters</span>
          {activeFilterCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-repixl-red px-1 text-[9px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <p className="text-sm text-repixl-text-light/70" aria-live="polite">
          <span className="text-base font-semibold text-repixl-text-light">{count}</span>{' '}
          {count === 1 ? 'camera' : 'cameras'}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.2em] text-repixl-muted sm:inline">Sort by</span>
        <SortListbox value={sort} onChange={onSortChange} />
      </div>
    </div>
  )
}
