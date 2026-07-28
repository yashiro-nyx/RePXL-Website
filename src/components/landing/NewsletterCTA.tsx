'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function NewsletterCTA() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="bg-repixl-bg py-20 md:py-28">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-lg text-center"
        >
          <h2 className="font-display text-display-sm text-repixl-text-light md:text-display-md">
            Stay in the loop
          </h2>
          <p className="mt-2 text-sm text-repixl-text-light/60">
            New arrivals, restocks, and collector tips — no spam, just cameras.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              // newsletter subscription placeholder
            }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              placeholder="you@example.com"
              className="flex-1 rounded border border-repixl-muted/20 bg-repixl-charcoal px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/60 focus:border-repixl-muted/50 focus:outline-none focus:ring-1 focus:ring-repixl-muted/30"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded bg-repixl-red px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50"
            >
              Subscribe
            </button>
          </form>

          <p className="mt-4 font-mono text-[10px] text-repixl-muted">
            Unsubscribe anytime. We respect your inbox.
          </p>
        </motion.div>
      </Container>
    </section>
  )
}
