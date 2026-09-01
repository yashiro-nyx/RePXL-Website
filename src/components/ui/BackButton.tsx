'use client'

import { useRouter } from 'next/navigation'

interface BackButtonProps {
  /** Override the back action with a specific href instead of router.back() */
  href?: string
  /** Optional label. Defaults to "Back" */
  label?: string
  className?: string
}

/**
 * Consistent Back navigation button used across PDP, support pages, etc.
 * Positioned inline with breadcrumbs/page headers — not floating awkwardly.
 */
export function BackButton({ href, label = 'Back', className = '' }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (href) router.push(href)
    else router.back()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`group inline-flex items-center gap-2 rounded-xl border border-repixl-muted/20 bg-repixl-charcoal/60 px-3.5 py-2 font-mono text-[10px] uppercase tracking-widest text-repixl-muted transition-all hover:border-repixl-muted/40 hover:bg-repixl-charcoal hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 ${className}`}
      aria-label={`Go back: ${label}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-transform group-hover:-translate-x-0.5"
        aria-hidden="true"
      >
        <path d="M19 12H5" /><path d="m12 5-7 7 7 7" />
      </svg>
      {label}
    </button>
  )
}
