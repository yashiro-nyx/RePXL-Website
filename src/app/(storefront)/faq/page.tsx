'use client'

import { useState } from 'react'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: "How does your condition grading work?",
    answer:
      "Every camera that passes through RePXL is assessed against our standardized four-tier grading system: Mint, Excellent, Good, and Fair. Each grade evaluates cosmetic condition, functional performance, included accessories, and documented testing results. Our grading is performed by experienced collectors — not automated — and every assessment is documented with multi-angle photography so you can verify the grade yourself before purchasing.",
  },
  {
    question: "What\u2019s included when a camera ships?",
    answer:
      "What ships with each camera depends on its condition grade and is clearly listed on every product page. Mint-grade cameras include original box, manual, strap, and cables where available. Excellent-grade cameras ship with a battery and memory card at minimum. Good-grade listings include a camera and battery, while Fair-grade listings include the camera body only unless otherwise noted. Every listing specifies exactly what you\u2019ll receive — no guessing.",
  },
  {
    question: "What is your return policy for condition mismatches?",
    answer:
      "If the camera you receive doesn\u2019t match its listed condition grade, you\u2019re eligible for a full refund within 14 days of delivery. We cover return shipping for condition mismatches — you won\u2019t pay a cent. Just contact us with photos showing the discrepancy, and we\u2019ll issue a prepaid return label. Refunds are processed within 5\u20137 business days of receiving the returned item.",
  },
  {
    question: "How do you test batteries and memory cards?",
    answer:
      "Batteries are charge-cycled and tested for capacity before listing. We note the approximate charge retention in listings (e.g., \u201Cholds charge for a full day session\u201D or \u201Creduced capacity \u2014 charges to ~60%\u201D). Memory cards are formatted, write-tested, and verified for read/write integrity. If a battery or card shows degraded performance, it\u2019s documented honestly in the listing notes.",
  },
  {
    question: "How can I sell my cameras on RePXL?",
    answer:
      "RePXL is a curated marketplace \u2014 we don\u2019t operate as an open peer-to-peer platform. If you have vintage digital cameras you\u2019d like to sell, contact us via our Contact page with details about the camera (model, condition, photos). Our team will assess whether it fits our catalog and make you an offer or discuss consignment options. We handle all grading, photography, and listing work.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept Visa, Mastercard, GCash, and PayPal. All transactions are processed through secure, encrypted payment gateways. We never store your full card details on our servers. For high-value purchases, additional verification may be required for your protection.",
  },
  {
    question: "How long does shipping take?",
    answer:
      "Standard domestic shipping takes 3\u20135 business days. Express shipping (1\u20132 business days) is available at checkout for an additional fee. All cameras are packaged with anti-static wrap, foam padding, and double-boxed for protection \u2014 vintage electronics are fragile, and we treat them accordingly. You\u2019ll receive tracking information via email as soon as your order ships.",
  },
  {
    question: "Do you guarantee sensor and lens condition?",
    answer:
      "Yes. Sensor cleanliness and lens clarity are core components of our grading process. Mint and Excellent grades guarantee a clean sensor and clear lens with no fungus, haze, or separation. Good-grade cameras may have minor sensor dust that doesn\u2019t appear in photos (documented in listing). Fair-grade cameras may have visible sensor or lens issues, which are always clearly described and photographed. If the actual condition doesn\u2019t match our description, our return policy applies.",
  },
  {
    question: "Do you ship internationally?",
    answer:
      "International shipping is not available yet. We\u2019re currently focused on domestic orders to ensure we can maintain our packaging standards and offer reliable tracking. We\u2019re actively working on expanding to international markets \u2014 join our newsletter to be notified when international shipping becomes available.",
  },
  {
    question: "Can I inspect a camera before buying?",
    answer:
      "While we don\u2019t offer in-person inspection, every listing includes multi-angle photography under consistent lighting, a detailed condition assessment, and documented test results. Our 14-day return policy for condition mismatches means you\u2019re never stuck with a camera that doesn\u2019t match its description. If you have specific questions about a listing, reach out via our Contact page \u2014 we\u2019re happy to provide additional photos or details.",
  },
]

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
