'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
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
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          className="mx-auto max-w-2xl"
        >
          {/* Section header */}
          <div className="text-center">
            <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
              — Got Questions
            </span>
            <RevealText
              as="h2"
              text="Questions, answered."
              className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg"
            />
            <p className="mx-auto mt-3 max-w-md text-sm text-repixl-text-light/60">
              The most common things buyers ask before their first purchase.
            </p>
          </div>

          {/* Accordion */}
          <div className="mt-12 divide-y divide-repixl-muted/10">
            {homeFaqs.map((faq, index) => {
              const isOpen = openIndex === index
              return (
                <div key={index}>
                  <button
                    onClick={() => toggle(index)}
                    className="group flex w-full items-center justify-between gap-4 py-5 text-left transition-colors"
                    aria-expanded={isOpen}
                  >
                    <span
                      className={`text-sm font-medium transition-colors ${
                        isOpen ? 'text-repixl-red' : 'text-repixl-text-light/90 group-hover:text-repixl-text-light'
                      }`}
                    >
                      {faq.question}
                    </span>
                    <motion.span
                      animate={{ rotate: isOpen ? 45 : 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
                      className={`flex-shrink-0 transition-colors ${isOpen ? 'text-repixl-red' : 'text-repixl-muted group-hover:text-repixl-text-light/70'}`}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                    </motion.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={reducedMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reducedMotion ? { height: 'auto', opacity: 1 } : { height: 0, opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                        className="overflow-hidden"
                      >
                        <div className="pb-5 pr-8">
                          <p className="text-sm leading-relaxed text-repixl-text-light/60">
                            {faq.answer}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })}
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