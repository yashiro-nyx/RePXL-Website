'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { ConditionBadge, CornerBracket, type Condition } from '@/components/ui'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface GradeInfo {
  condition: Condition
  description: string
}

const grades: GradeInfo[] = [
  {
    condition: 'mint',
    description: 'Like-new condition. No visible wear, fully tested, all functions working perfectly.',
  },
  {
    condition: 'excellent',
    description: 'Minimal signs of use. Light cosmetic marks only — fully functional, well cared for.',
  },
  {
    condition: 'good',
    description: 'Normal wear from regular use. Minor scuffs or marks — all core functions working.',
  },
  {
    condition: 'fair',
    description: 'Visible wear or cosmetic damage. Fully functional but shows its history clearly.',
  },
]

export function ConditionExplainer() {
  const reducedMotion = useReducedMotion()

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : 0.1,
        delayChildren: reducedMotion ? 0 : 0.1,
      },
    },
  }

  const card = {
    hidden: reducedMotion
      ? { opacity: 1, y: 0 }
      : { opacity: 0, y: 18 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    <section className="py-24 md:py-36">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
        >
          {/* Section header */}
          <div className="mb-12 text-center md:mb-16">
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Transparency first
            </span>
            <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
              What our grades mean
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-repixl-text-light/60">
              Every camera is inspected, graded, and photographed before listing.
              No guesswork — you know exactly what you&apos;re getting.
            </p>
          </div>

          {/* Grade cards */}
          <CornerBracket
            size={16}
            color="rgba(140, 133, 128, 0.25)"
            className="mx-auto max-w-3xl p-6 md:p-10"
          >
            <motion.div
              variants={container}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: '-40px' }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2"
            >
              {grades.map((grade) => (
                <motion.div
                  key={grade.condition}
                  variants={card}
                  whileHover={reducedMotion ? undefined : { y: -4, borderColor: 'rgba(194, 44, 44, 0.35)' }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="group flex flex-col gap-2 rounded-md border border-repixl-muted/10 bg-repixl-charcoal p-5 transition-shadow duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-center justify-between">
                    <ConditionBadge condition={grade.condition} />
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-repixl-muted/30 transition-colors duration-300 group-hover:bg-repixl-red"
                    />
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-repixl-text-light/70">
                    {grade.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* Bottom note */}
            <p className="mt-8 text-center font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              Serial numbers verified · Multi-angle photos · 7-day return window
            </p>
          </CornerBracket>
        </motion.div>
      </Container>
    </section>
  )
}