'use client'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="mt-4 flex items-center justify-center gap-2">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:bg-repixl-charcoal disabled:cursor-not-allowed disabled:opacity-30"
      >
        Previous
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
            page === currentPage
              ? 'bg-repixl-red text-white'
              : 'border border-repixl-muted/20 text-repixl-text-light/70 hover:bg-repixl-charcoal'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="rounded-lg border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:bg-repixl-charcoal disabled:cursor-not-allowed disabled:opacity-30"
      >
        Next
      </button>
    </div>
  )
}
