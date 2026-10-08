'use client'

import type { ReactNode } from 'react'

type FeedbackKind = 'loading' | 'error' | 'empty'

interface FeedbackStateProps {
  kind: FeedbackKind
  title: string
  message?: string
  action?: ReactNode
  className?: string
}

const icons: Record<Exclude<FeedbackKind, 'loading'>, ReactNode> = {
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 8v4" /><path d="M12 16h.01" />
    </svg>
  ),
  empty: (
    <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" />
    </svg>
  ),
}

export function FeedbackState({ kind, title, message, action, className = '' }: FeedbackStateProps) {
  const liveRole = kind === 'error' ? 'alert' : 'status'

  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center ${kind === 'error' ? 'border-repixl-red/30 bg-repixl-red/[0.04]' : 'border-repixl-muted/20 bg-repixl-charcoal/20'} ${className}`} role={liveRole} aria-live={kind === 'error' ? 'assertive' : 'polite'}>
      {kind === 'loading' ? (
        <div className="relative mb-5 flex h-12 w-12 items-center justify-center" aria-hidden="true">
          <div className="absolute inset-0 rounded-full border border-repixl-muted/15" />
          <div className="absolute inset-0 animate-spin rounded-full border border-transparent border-t-repixl-red motion-reduce:hidden" />
          <span className="h-2 w-2 rounded-full bg-repixl-red" />
        </div>
      ) : (
        <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${kind === 'error' ? 'bg-repixl-red/10 text-repixl-red' : 'bg-repixl-charcoal text-repixl-muted'}`}>
          {icons[kind]}
        </div>
      )}
      <h2 className="font-display text-xl text-repixl-text-light">{title}</h2>
      {message && <p className="mt-2 max-w-md text-sm leading-relaxed text-repixl-muted">{message}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
