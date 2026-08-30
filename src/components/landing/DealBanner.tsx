'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function DealBanner() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="py-16 md:py-20">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative flex min-h-[420px] items-center overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/editorial-2.svg"
            alt="Featured vintage camera on a dark background"
            className="pointer-events-none absolute inset-y-0 right-0 h-full w-1/2 object-cover opacity-70 md:opacity-90"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-repixl-charcoal via-repixl-charcoal/90 to-transparent md:via-repixl-charcoal/60" />

          <div className="relative z-10 max-w-md px-8 py-12 md:px-14">
            <h3 className="font-display text-display-lg text-repixl-text-light">Hottest Deals</h3>
            <p className="mt-4 text-sm leading-relaxed text-repixl-text-light/70">
              Save up to $40 on selected 2000s compacts this week — mint and
              excellent-grade Canon and Nikon bodies, while stock lasts.
            </p>
            <Link href="/products">
              <button
                type="button"
                className="mt-8 rounded bg-repixl-text-light px-6 py-2.5 font-mono text-xs uppercase tracking-widest text-repixl-text-dark transition-colors hover:bg-white"
              >
                View All
              </button>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
