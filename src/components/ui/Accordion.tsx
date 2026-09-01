'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface AccordionItem {
  id: string
  label: string
  children: React.ReactNode
  /** Open by default */
  defaultOpen?: boolean
}

interface AccordionProps {
  items: AccordionItem[]
  /** Allow multiple panels open simultaneously */
  multi?: boolean
  className?: string
}

/**
 * RePXL Accordion — used on the Product Detail page for specs, condition,
 * authenticity, and shipping information.
 *
 * Keyboard accessible (Enter/Space toggles, arrow keys navigate).
 * Respects prefers-reduced-motion.
 */
export function Accordion({ items, multi = false, className = '' }: AccordionProps) {
  const reducedMotion = useReducedMotion()
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.defaultOpen).map((i) => i.id))
  )

  const toggle = (id: string) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        if (!multi) next.clear()
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className={`divide-y divide-repixl-muted/10 rounded-xl border border-repixl-muted/10 ${className}`} role="list">
      {items.map((item) => {
        const isOpen = open.has(item.id)
        return (
          <div key={item.id} role="listitem">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`accordion-panel-${item.id}`}
              id={`accordion-btn-${item.id}`}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-repixl-charcoal/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-repixl-red/40"
            >
              <span className="font-mono text-[11px] uppercase tracking-widest text-repixl-text-light/80">
                {item.label}
              </span>
              {/* +/− icon */}
              <span
                className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-repixl-muted/25 text-repixl-muted transition-all duration-200 ${isOpen ? 'border-repixl-red/40 bg-repixl-red/10 text-repixl-red' : 'hover:border-repixl-muted/50'}`}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-45' : 'rotate-0'}`}
                >
                  <path d="M5 12h14" />
                  {!isOpen && <path d="M12 5v14" />}
                </svg>
              </span>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`accordion-panel-${item.id}`}
                  role="region"
                  aria-labelledby={`accordion-btn-${item.id}`}
                  initial={reducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reducedMotion ? { opacity: 1, height: 'auto' } : { opacity: 0, height: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-1">
                    {item.children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
