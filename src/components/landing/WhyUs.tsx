'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const reasons = [
  {
    title: 'Condition-Graded Listings',
    description: 'Every camera is hand-inspected and graded Mint to Fair — no surprises.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
  },
  {
    title: 'Free Shipping Over $150',
    description: 'No code needed — applied automatically at checkout on eligible orders.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" /><path d="M16 8h4l3 3v5h-7V8z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></svg>
    ),
  },
  {
    title: 'Buyer Protection',
    description: '14-day returns and a verified serial number on every listing.',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4" /><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
    ),
  },
]

export function WhyUs() {
  const reducedMotion = useReducedMotion()

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: reducedMotion ? 0 : 0.1 } },
  }
  const item = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] } },
  }

  return (
    <section className="py-16 md:py-20">
      <Container>
        <h2 className="mb-12 font-display text-display-md text-repixl-text-light md:text-display-lg">
          Why RePXL
        </h2>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-1 gap-10 border-t border-repixl-muted/15 pt-10 sm:grid-cols-3 sm:gap-8"
        >
          {reasons.map((r) => (
            <motion.div key={r.title} variants={item} className="flex items-start gap-4">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-repixl-red/30 text-repixl-red">
                {r.icon}
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-repixl-text-light">{r.title}</h3>
                <p className="mt-1.5 text-sm text-repixl-text-light/60">{r.description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  )
}
