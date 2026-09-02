'use client'

/**
 * PageLoader — lightweight full-page loading state.
 *
 * Used on protected/data-dependent pages while auth + data hydrates.
 * Simpler than FilmStripLoader — just a centered brand mark with a
 * subtle spinner, fast to render, no image loading required.
 *
 * Respects prefers-reduced-motion: the spinning animation is replaced
 * with a static pulsing mark.
 */

import { useReducedMotion } from '@/hooks/useReducedMotion'

interface PageLoaderProps {
  label?: string
}

export function PageLoader({ label = 'Loading…' }: PageLoaderProps) {
  const reduced = useReducedMotion()

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-5 bg-repixl-bg"
      role="status"
      aria-label={label}
      aria-live="polite"
    >
      {/* Branded spinner — REC dot + ring */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        {/* Outer ring */}
        <div
          className={`absolute inset-0 rounded-full border-2 border-repixl-muted/10 ${
            reduced ? 'animate-pulse' : ''
          }`}
        />
        {/* Spinning arc */}
        {!reduced && (
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-repixl-red" />
        )}
        {/* Center brand dot */}
        <span
          className={`h-2.5 w-2.5 rounded-full bg-repixl-red ${reduced ? 'animate-pulse' : ''}`}
          aria-hidden="true"
        />
      </div>

      {/* Label */}
      <p className="font-mono text-[11px] uppercase tracking-widest text-repixl-muted/60">
        {label}
      </p>

      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * InlineLoader — compact spinner for use inside sections (not full-page).
 * Same brand treatment but contained within a flex row.
 */
export function InlineLoader({ label = 'Loading…', className = '' }: { label?: string; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <div
      className={`flex items-center justify-center gap-3 py-12 ${className}`}
      role="status"
      aria-label={label}
    >
      <div className="relative flex h-8 w-8 items-center justify-center">
        <div className={`absolute inset-0 rounded-full border border-repixl-muted/15 ${reduced ? 'animate-pulse' : ''}`} />
        {!reduced && (
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-repixl-red" />
        )}
        <span className={`h-1.5 w-1.5 rounded-full bg-repixl-red ${reduced ? 'animate-pulse' : ''}`} aria-hidden="true" />
      </div>
      <p className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted/60">{label}</p>
      <span className="sr-only">{label}</span>
    </div>
  )
}
