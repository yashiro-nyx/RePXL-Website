'use client'

import { pageWindow, PAGE_ELLIPSIS } from '@/lib/catalog-filters'

/**
 * Accessible pagination: Previous / numbered pages (with intelligent ellipsis) /
 * Next. Previous is disabled on the first page and Next on the last. Rendered
 * only when there is more than one page.
 */
export function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  if (totalPages <= 1) return null

  const items = pageWindow(page, totalPages)
  const atStart = page <= 1
  const atEnd = page >= totalPages

  const arrowClass = (disabled: boolean) =>
    [
      'inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
      disabled
        ? 'cursor-not-allowed border-repixl-muted/10 text-repixl-muted/40'
        : 'border-repixl-muted/25 text-repixl-text-light/85 hover:border-repixl-muted/45 hover:text-repixl-text-light',
    ].join(' ')

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Catalog pagination">
      <button type="button" onClick={() => onPageChange(page - 1)} disabled={atStart} className={arrowClass(atStart)} aria-label="Previous page">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        <span className="hidden sm:inline">Previous</span>
      </button>

      <ul className="flex items-center gap-1">
        {items.map((it, idx) =>
          it === PAGE_ELLIPSIS ? (
            <li key={`gap-${idx}`} aria-hidden="true" className="px-1.5 text-sm text-repixl-muted/60">
              {PAGE_ELLIPSIS}
            </li>
          ) : (
            <li key={it}>
              <button
                type="button"
                onClick={() => onPageChange(it)}
                aria-label={`Page ${it}`}
                aria-current={it === page ? 'page' : undefined}
                className={[
                  'flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40',
                  it === page
                    ? 'border-repixl-red bg-repixl-red/10 font-semibold text-repixl-text-light'
                    : 'border-repixl-muted/20 text-repixl-text-light/75 hover:border-repixl-muted/45 hover:text-repixl-text-light',
                ].join(' ')}
              >
                {it}
              </button>
            </li>
          )
        )}
      </ul>

      <button type="button" onClick={() => onPageChange(page + 1)} disabled={atEnd} className={arrowClass(atEnd)} aria-label="Next page">
        <span className="hidden sm:inline">Next</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
      </button>
    </nav>
  )
}
