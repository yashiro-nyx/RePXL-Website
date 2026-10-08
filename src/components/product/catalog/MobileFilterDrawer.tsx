'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import { FilterSidebar, type FilterSidebarProps } from './FilterSidebar'

/**
 * Mobile/tablet filter drawer. Wraps the SAME `FilterSidebar` used on desktop so
 * the two surfaces cannot diverge. Provides Apply/Close, keyboard access
 * (Escape to close, focus moves into the panel), and a results-count CTA.
 */
export function MobileFilterDrawer({
  open,
  onClose,
  resultCount,
  ...sidebar
}: FilterSidebarProps & {
  open: boolean
  onClose: () => void
  resultCount: number
}) {
  const reducedMotion = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)

  useFocusTrap({ active: open, containerRef: panelRef })

  // Escape closes; move focus into the panel on open; lock background scroll.
  useEffect(() => {
    if (!open) return
    panelRef.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            initial={reducedMotion ? {} : { x: '-100%' }}
            animate={{ x: 0 }}
            exit={reducedMotion ? {} : { x: '-100%' }}
            transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-[160] flex w-[85vw] max-w-sm flex-col bg-repixl-charcoal shadow-2xl outline-none lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filter cameras"
            aria-describedby="filter-drawer-description"
          >
            <div className="flex items-center justify-between border-b border-repixl-muted/15 px-5 py-4">
              <div>
                <p className="font-display text-base font-semibold text-repixl-text-light">Filters</p>
                <p id="filter-drawer-description" className="sr-only">Refine the cameras shown in the collection.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-11 items-center justify-center rounded-full text-repixl-muted hover:bg-repixl-bg hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40"
                aria-label="Close filters"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <FilterSidebar {...sidebar} />
            </div>

            <div className="border-t border-repixl-muted/15 p-4">
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 w-full rounded-xl bg-repixl-red px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-repixl-charcoal"
              >
                Show {resultCount} {resultCount === 1 ? 'camera' : 'cameras'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
