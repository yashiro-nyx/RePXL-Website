'use client'

/**
 * Professional no-results state for the catalog. Only suggests adjusting the
 * filters that actually exist — never fabricated categories.
 */
export function CatalogEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-repixl-muted/20 py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-repixl-charcoal/50">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /><path d="M8 11h6" />
        </svg>
      </div>
      <p className="font-display text-display-sm text-repixl-text-light/70">No cameras match your filters</p>
      <p className="mt-1.5 max-w-sm text-sm text-repixl-muted">
        Try adjusting your price range, brand, condition, or rating.
      </p>
      <button
        type="button"
        onClick={onClearFilters}
        className="mt-5 rounded-xl border border-repixl-muted/25 px-5 py-2.5 text-sm text-repixl-red transition-colors hover:border-repixl-red/50 hover:bg-repixl-red/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
      >
        Clear Filters
      </button>
    </div>
  )
}
