'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const TICKER_ITEMS = [
  'Authenticity Guaranteed',
  'Every Camera Film-Tested',
  'Free Returns Within 14 Days',
  'Certified Working Condition',
  'Serial Number Verified',
  'Condition-Graded Listings',
  'Secure Checkout',
  'Buyer Protection',
]

const SEPARATOR = (
  <span className="mx-6 text-repixl-red/60" aria-hidden="true">✽</span>
)

// Build the ticker string as React nodes
function TickerContent() {
  return (
    <>
      {TICKER_ITEMS.map((item, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-text-light/80">
            {item}
          </span>
          {SEPARATOR}
        </span>
      ))}
    </>
  )
}

export function TrustStrip() {
  const reducedMotion = useReducedMotion()

  return (
    <div className="relative z-10 overflow-hidden border-y border-repixl-muted/10 bg-repixl-charcoal/40 py-3 backdrop-blur-sm">
      {/* Left/right fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-repixl-charcoal/40 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-repixl-charcoal/40 to-transparent" />

      <motion.div
        className="flex whitespace-nowrap"
        animate={reducedMotion ? {} : { x: ['0%', '-50%'] }}
        transition={{
          repeat: Infinity,
          duration: 28,
          ease: 'linear',
        }}
        aria-hidden="true"
      >
        {/* Doubled for seamless loop */}
        <span className="inline-flex items-center">
          <TickerContent />
          <TickerContent />
        </span>
      </motion.div>

      {/* Accessible static version for screen readers */}
      <p className="sr-only">
        {TICKER_ITEMS.join(' · ')}
      </p>
    </div>
  )
}
