'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useToastStore, type Toast } from '@/stores/toastStore'

// ─── Per-toast style config ────────────────────────────────────────────────────
const config = {
  success: {
    iconBg: 'bg-repixl-success/15',
    iconColor: 'text-repixl-success',
    bar: 'bg-repixl-success',
    border: 'border-repixl-success/20',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
  },
  error: {
    iconBg: 'bg-repixl-red/15',
    iconColor: 'text-repixl-red',
    bar: 'bg-repixl-red',
    border: 'border-repixl-red/20',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="15" x2="9" y1="9" y2="15" /><line x1="9" x2="15" y1="9" y2="15" />
      </svg>
    ),
  },
  info: {
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    bar: 'bg-blue-400',
    border: 'border-blue-400/20',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
      </svg>
    ),
  },
} as const

// ─── Single toast ──────────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const [progress, setProgress] = useState(100)
  const rafRef = useRef<number | null>(null)
  const c = config[toast.type]

  useEffect(() => {
    const start = toast.createdAt
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.max(0, 100 - (elapsed / toast.duration) * 100)
      setProgress(pct)
      if (pct > 0) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  }, [toast.createdAt, toast.duration])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 56, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 56, scale: 0.94, transition: { duration: 0.2 } }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      className={`relative w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border bg-repixl-charcoal shadow-2xl shadow-black/60 ${c.border}`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Product image (when available) or icon */}
        {toast.image ? (
          <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl border border-repixl-muted/15 bg-repixl-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={toast.image} alt="" className="h-full w-full object-contain p-1" aria-hidden="true" />
          </div>
        ) : (
          <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${c.iconBg} ${c.iconColor}`}>
            {c.icon}
          </div>
        )}

        {/* Text content */}
        <div className="min-w-0 flex-1">
          {/* Type label */}
          <p className={`font-mono text-[9px] uppercase tracking-widest ${c.iconColor}`}>
            {toast.type === 'success' ? 'Success' : toast.type === 'error' ? 'Error' : 'Info'}
          </p>
          <p className="mt-0.5 text-sm font-medium leading-snug text-repixl-text-light">
            {toast.message}
          </p>
          {toast.action && (
            <Link
              href={toast.action.href}
              onClick={() => onRemove(toast.id)}
              className={`mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${c.iconColor} border-current/30 hover:opacity-80`}
            >
              {toast.action.label}
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
              </svg>
            </Link>
          )}
        </div>

        {/* Dismiss */}
        <button
          type="button"
          onClick={() => onRemove(toast.id)}
          aria-label="Dismiss"
          className="mt-0.5 flex-shrink-0 rounded-lg p-1 text-repixl-muted/50 transition-colors hover:bg-repixl-muted/10 hover:text-repixl-text-light"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-[2px] w-full bg-repixl-muted/10">
        <div
          className={`h-full ${c.bar} opacity-70 transition-none`}
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>
    </motion.div>
  )
}

// ─── Container ─────────────────────────────────────────────────────────────────
export function GlobalToast() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  return (
    <div
      className="fixed bottom-6 right-4 z-[300] flex flex-col-reverse gap-2.5 sm:right-6"
      aria-label="Notifications"
      aria-atomic="false"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>
  )
}
