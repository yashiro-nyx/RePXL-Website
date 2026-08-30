'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function PromoDuo() {
  const reducedMotion = useReducedMotion()

  const fadeUp = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Top Deals */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-charcoal p-8"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-10 -right-6 select-none font-display font-bold leading-none text-white/[0.04]"
              style={{ fontSize: 'clamp(5rem, 10vw, 8rem)' }}
            >
              %
            </span>
            <RevealText
              as="h3"
              text="Top Deals"
              className="font-display text-display-sm text-repixl-text-light"
            />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-widest text-repixl-muted">Up to</p>
              <p className="mt-1 font-display text-5xl font-bold text-repixl-rose md:text-6xl">30% OFF</p>
              <p className="mt-2 font-mono text-xs uppercase tracking-widest text-repixl-muted">Selected Brands</p>
              <Link
                href="/products"
                className="mt-6 inline-block border-b border-repixl-text-light/40 pb-0.5 font-mono text-xs uppercase tracking-widest text-repixl-text-light transition-colors hover:border-repixl-red hover:text-repixl-red"
              >
                Shop Now
              </Link>
            </div>
          </motion.div>

          {/* Staff Pick */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: false, margin: '-60px' }}
            transition={{ delay: reducedMotion ? 0 : 0.1 }}
            className="relative flex min-h-[380px] flex-col justify-between overflow-hidden rounded-lg border border-repixl-muted/15 bg-repixl-bg p-8"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/product-sony-w800.svg"
              alt="Staff pick camera"
              className="pointer-events-none absolute -bottom-6 -right-6 h-52 w-52 opacity-90 md:h-64 md:w-64"
            />
            <RevealText
              as="h3"
              text="Our Staff Pick"
              className="relative font-display text-display-sm text-repixl-text-light"
            />
            <div className="relative">
              <p className="max-w-[60%] text-sm text-repixl-text-light/70">
                Tune into a sharper shot — the Sony CyberShot W800, loved for its
                pocketable body and true-to-life color.
              </p>
              <Link
                href="/products?brand=sony"
                className="mt-6 inline-block border-b border-repixl-text-light/40 pb-0.5 font-mono text-xs uppercase tracking-widest text-repixl-text-light transition-colors hover:border-repixl-red hover:text-repixl-red"
              >
                Shop Now
              </Link>
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}