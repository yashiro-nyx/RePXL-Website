'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  onPageChange: (page: number) => void
  /** Optional label shown as "Showing X–Y of Z <itemLabel>" */
  itemLabel?: string
}

/** Build a compact page range with ellipsis for large page counts. */
function buildPageRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '…')[] = []
  // Always show first page
  pages.push(1)
  if (current > 3) pages.push('…')
  // Window around current
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('…')
  // Always show last page
  pages.push(total)
  return pages
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'items',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = buildPageRange(currentPage, totalPages)
  const from = pageSize ? (currentPage - 1) * pageSize + 1 : undefined
  const to = pageSize ? Math.min(currentPage * pageSize, totalItems ?? currentPage * pageSize) : undefined

  return (
    <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Item count label */}
      {totalItems !== undefined && pageSize !== undefined ? (
        <p className="order-2 font-mono text-[10px] text-repixl-muted sm:order-1">
          Showing {from}–{to} of {totalItems} {itemLabel}
        </p>
      ) : (
        <span className="order-2 sm:order-1" />
      )}

      {/* Page controls */}
      <nav
        role="navigation"
        aria-label="Pagination"
        className="order-1 flex items-center gap-1 sm:order-2"
      >
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:bg-repixl-charcoal disabled:cursor-not-allowed disabled:opacity-30"
        >
          ← Prev
        </button>

        {pages.map((page, idx) =>
          page === '…' ? (
            <span
              key={`ellipsis-${idx}`}
              className="flex h-8 w-6 items-end justify-center pb-1 font-mono text-xs text-repixl-muted"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-label={`Page ${page}`}
              aria-current={page === currentPage ? 'page' : undefined}
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                page === currentPage
                  ? 'bg-repixl-red text-white'
                  : 'border border-repixl-muted/20 text-repixl-text-light/70 hover:bg-repixl-charcoal'
              }`}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:bg-repixl-charcoal disabled:cursor-not-allowed disabled:opacity-30"
        >
          Next →
        </button>
      </nav>
    </div>
  )
}
