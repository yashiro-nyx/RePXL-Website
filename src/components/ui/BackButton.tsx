'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface BackButtonProps {
  /** Explicit parent route — preferred over router.back() for predictable navigation */
  href?: string
  /** Label shown after the arrow. Defaults to "Back" */
  label?: string
  className?: string
}

/**
 * Consistent Back navigation control used across detail pages and support pages.
 * Prefer `href` for known parent routes so the button works even when the page
 * is accessed directly (bookmark, hard refresh, external link).
 */
export function BackButton({ href, label = 'Back', className = '' }: BackButtonProps) {
  const router = useRouter()

  const baseClass = `group inline-flex items-center gap-2 rounded-lg border border-repixl-muted/25
    bg-repixl-charcoal/60 px-4 py-2.5 font-mono text-xs uppercase tracking-wider
    text-repixl-muted transition-all
    hover:border-repixl-muted/50 hover:bg-repixl-charcoal hover:text-repixl-text-light
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50
    focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-bg
    active:bg-repixl-charcoal active:text-repixl-text-light ${className}`

  const arrow = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="transition-transform group-hover:-translate-x-0.5"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 5-7 7 7 7" />
    </svg>
  )

  if (href) {
    return (
      <Link href={href} className={baseClass} aria-label={`Back to ${label}`}>
        {arrow}
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={baseClass}
      aria-label={`Go back: ${label}`}
    >
      {arrow}
      {label}
    </button>
  )
}
