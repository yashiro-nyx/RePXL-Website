'use client'

import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { faqs } from '@/data/faqs'

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div>
      <section className="pb-20 pt-32 md:pb-28 md:pt-40">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Support
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              Frequently Asked Questions
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70">
              Everything you need to know about buying, selling, and trusting
              vintage cameras on RePXL.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-2xl divide-y divide-repixl-muted/10">
            {faqs.map((faq, index) => (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-repixl-text-light"
                  aria-expanded={openIndex === index}
                >
                  <span className="text-sm font-medium text-repixl-text-light/90">
                    {faq.question}
                  </span>
                  <span className="flex-shrink-0 text-repixl-muted">
                    {openIndex === index ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    ) : (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
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
        </Container>
      </section>

      <Footer />
    </div>
  )
}
