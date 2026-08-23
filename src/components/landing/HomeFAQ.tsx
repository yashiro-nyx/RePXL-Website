'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { homeFaqs } from '@/data/faqs'

export function HomeFAQ() {
  const reducedMotion = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-24 md:py-36">
      <Container>
        <motion.div
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl"
        >
          {/* Section header */}
          <div className="text-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              — Got Questions
            </span>
            <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
              Questions, answered.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-repixl-text-light/60">
              The most common things buyers ask before their first purchase.
            </p>
          </div>

          {/* Accordion */}
          <div className="mt-12 divide-y divide-repixl-muted/10">
            {homeFaqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
                  aria-expanded={openIndex === index}
                >
                  <span className="text-sm font-medium text-repixl-text-light/90">
                    {faq.question}
                  </span>
                  <span className="flex-shrink-0 text-repixl-muted">
                    {openIndex === index ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    )}
                  </span>
                </button>
                {openIndex === index && (
                  <div className="pb-5 pr-8">
                    <p className="text-sm leading-relaxed text-repixl-text-light/60">
                      {faq.answer}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* View all link */}
          <div className="mt-8 text-center">
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-repixl-red transition-colors hover:text-repixl-red/80"
            >
              View all FAQs
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
            </Link>
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
