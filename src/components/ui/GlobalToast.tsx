'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore, type Toast } from '@/stores/toastStore'

// ─── Icons ────────────────────────────────────────────────────────────────────
function SuccessIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
function ErrorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" />
    </svg>
  )
}
function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
  )
}
function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  )
}

// ─── Per-toast styles ─────────────────────────────────────────────────────────
const config = {
  success: {
    icon: <SuccessIcon />,
    iconBg: 'bg-repixl-success/15',
    iconColor: 'text-repixl-success',
    bar: 'bg-repixl-success',
    border: 'border-repixl-success/20',
  },
  error: {
    icon: <ErrorIcon />,
    iconBg: 'bg-repixl-red/15',
    iconColor: 'text-repixl-red',
    bar: 'bg-repixl-red',
    border: 'border-repixl-red/20',
  },
  info: {
    icon: <InfoIcon />,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    bar: 'bg-blue-400',
    border: 'border-blue-400/20',
  },
} as const

// ─── Single toast item ────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number>(Date.now())
  const c = config[toast.type]

  // Animate the progress bar down from 100→0 over the toast's duration
  useEffect(() => {
    startRef.current = toast.createdAt
    const tick = () => {
      const elapsed = Date.now() - startRef.current
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100)
      setProgress(pct)
      if (pct > 0) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [toast.createdAt, toast.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.92 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      className={`relative w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border bg-repixl-charcoal shadow-2xl shadow-black/50 backdrop-blur-md ${c.border}`}
    >
      {/* Main row */}
      <div className="flex items-start gap-3 px-4 py-3.5">
        {/* Icon */}
        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${c.iconBg} ${c.iconColor}`}>
          {c.icon}
        </div>

        {/* Text + action */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug text-repixl-text-light">
            {toast.message}
          </p>
          {toast.action && (
            <Link
              href={toast.action.href}
              onClick={() => onRemove(toast.id)}
              className={`mt-1.5 inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 transition-opacity hover:opacity-80 ${c.iconColor}`}
            >
              {toast.action.label}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          aria-label="Dismiss notification"
          className="mt-0.5 flex-shrink-0 text-repixl-muted/60 transition-colors hover:text-repixl-text-light"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 w-full bg-repixl-muted/10">
        <div
          className={`h-full transition-none ${c.bar} opacity-60`}
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  )
}

// ─── Container ────────────────────────────────────────────────────────────────
export function GlobalToast() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div
      className="fixed bottom-6 right-4 z-[300] flex flex-col-reverse gap-2 sm:right-6"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
