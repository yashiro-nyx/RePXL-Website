'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Button, BackButton, CornerBracket } from '@/components/ui'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { faqs, type FAQItem } from '@/data/faqs'

const categories = Array.from(new Set(faqs.map((f) => f.category)))

export default function FAQPage() {
  const reducedMotion = useReducedMotion()
  const [openIndex, setOpenIndex] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<FAQItem['category'] | 'All'>('All')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return faqs.filter((faq) => {
      const matchesCategory = activeCategory === 'All' || faq.category === activeCategory
      const matchesQuery =
        q === '' || faq.question.toLowerCase().includes(q) || faq.answer.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [query, activeCategory])

  const toggle = (key: string) => {
    setOpenIndex((prev) => (prev === key ? null : key))
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden pb-16 pt-32 md:pb-20 md:pt-40">
        <div
          className="pointer-events-none absolute inset-0 -z-10 flex select-none items-center justify-center"
          aria-hidden="true"
        >
          <span
            className="whitespace-nowrap font-display font-bold uppercase leading-none tracking-tighter text-white/[0.04]"
            style={{ fontSize: 'clamp(9rem, 18vw, 20rem)' }}
          >
            ANSWERS
          </span>
        </div>

        <Container>
          <BackButton href="/" label="Home" className="mb-6" />
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Support
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              <RevealText text="Frequently Asked Questions" as="span" />
            </h1>
            <motion.p
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.3 }}
              className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70"
            >
              Everything you need to know about buying, selling, and trusting
              vintage cameras on RePXL.
            </motion.p>
          </div>

          {/* Search */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.4 }}
            className="mx-auto mt-8 max-w-lg"
          >
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-repixl-muted"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search questions…"
                className="w-full rounded-full border border-repixl-muted/20 bg-repixl-charcoal py-3 pl-11 pr-4 text-sm text-repixl-text-light placeholder:text-repixl-muted/60 transition-colors focus:border-repixl-red/40 focus:outline-none focus:ring-1 focus:ring-repixl-red/20"
              />
            </div>

            {/* Category chips */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {(['All', ...categories] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full border px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-widest transition-colors duration-200 ${
                    activeCategory === cat
                      ? 'border-repixl-red bg-repixl-red text-white'
                      : 'border-repixl-muted/20 text-repixl-muted hover:border-repixl-red/40 hover:text-repixl-red'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </motion.div>
        </Container>
      </section>

      {/* Accordion list */}
      <section className="pb-24 md:pb-32">
        <Container>
          <div className="mx-auto max-w-2xl">
            {filtered.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal px-6 py-12 text-center"
              >
                <p className="text-sm text-repixl-text-light/70">
                  No questions match &ldquo;{query}&rdquo;.
                </p>
                <button
                  onClick={() => { setQuery(''); setActiveCategory('All') }}
                  className="mt-3 text-sm font-medium text-repixl-red transition-colors hover:text-repixl-red/80"
                >
                  Clear filters
                </button>
              </motion.div>
            ) : (
              <motion.div
                layout
                className="divide-y divide-repixl-muted/10"
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((faq) => {
                    const key = faq.question
                    const isOpen = openIndex === key
                    return (
                      <motion.div
                        key={key}
                        layout
                        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
                        transition={{ duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
                      >
                        <button
                          onClick={() => toggle(key)}
                          className="group flex w-full items-center justify-between gap-4 py-5 text-left"
                          aria-expanded={isOpen}
                        >
                          <span>
                            <span
                              className={`text-sm font-medium transition-colors ${
                                isOpen ? 'text-repixl-red' : 'text-repixl-text-light/90 group-hover:text-repixl-text-light'
                              }`}
                            >
                              {faq.question}
                            </span>
                            <span className="mt-1 block font-mono text-[9px] uppercase tracking-widest text-repixl-muted">
                              {faq.category}
                            </span>
                          </span>
                          <motion.span
                            animate={{ rotate: isOpen ? 45 : 0 }}
                            transition={{ duration: reducedMotion ? 0 : 0.25, ease: 'easeOut' }}
                            className={`flex-shrink-0 transition-colors ${isOpen ? 'text-repixl-red' : 'text-repixl-muted group-hover:text-repixl-text-light/70'}`}
                          >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
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
                      </motion.div>
                    )
                  })}
                </AnimatePresence>
              </motion.div>
            )}
          </div>

          {/* Still need help CTA */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            className="mx-auto mt-16 max-w-2xl"
          >
            <CornerBracket size={14} color="rgba(140, 133, 128, 0.25)" className="px-8 py-10 text-center">
              <h2 className="font-display text-display-sm text-repixl-text-light">
                Still have questions?
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-repixl-text-light/60">
                Our small team reads every message personally — reach out and we&apos;ll get back to you.
              </p>
              <Link href="/contact" className="mt-6 inline-block">
                <Button variant="primary" size="md">Contact Us</Button>
              </Link>
            </CornerBracket>
          </motion.div>
        </Container>
      </section>


    </div>
  )
}