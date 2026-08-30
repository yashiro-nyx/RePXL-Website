'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { CornerBracket } from '@/components/ui'
import { RevealText } from '@/components/ui/RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'

const quickFacts = [
  { icon: 'truck', label: 'Free shipping ₱5,000+' },
  { icon: 'clock', label: '14-day return window' },
  { icon: 'shield', label: 'Mismatch = full refund' },
  { icon: 'box', label: 'Double-boxed, always' },
]

const sections = [
  {
    id: 'domestic-shipping',
    icon: 'truck',
    title: 'Domestic Shipping',
    body: (
      <>
        <p>
          <strong className="text-repixl-text-light">Standard shipping:</strong>{' '}
          3–5 business days. Included free on orders over ₱5,000.
        </p>
        <p>
          <strong className="text-repixl-text-light">Express shipping:</strong>{' '}
          1–2 business days. Available at checkout for an additional fee.
        </p>
        <p>
          Tracking information is emailed to you as soon as your order is
          dispatched. All shipments require a signature on delivery.
        </p>
      </>
    ),
  },
  {
    id: 'packaging',
    icon: 'package',
    title: 'Packaging Standards',
    body: (
      <>
        <p>
          Vintage electronics are fragile — we package accordingly. Every
          camera ships with:
        </p>
        <ul className="list-none space-y-1.5">
          {[
            'Anti-static wrap around the camera body',
            'Foam padding on all sides',
            'Double-boxed for impact protection',
            'Silica gel packets to prevent moisture damage',
            'Accessories individually wrapped and secured',
          ].map((line) => (
            <li key={line} className="flex items-start gap-2 text-repixl-text-light/60">
              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-repixl-red" />
              {line}
            </li>
          ))}
        </ul>
        <p>
          We take the same care shipping a ₱2,000 point-and-shoot as we do
          a ₱15,000 collector piece.
        </p>
      </>
    ),
  },
  {
    id: 'return-window',
    icon: 'clock',
    title: 'Return Window',
    body: (
      <p>
        You have <strong className="text-repixl-text-light">14 days</strong>{' '}
        from the date of delivery to initiate a return. The camera must
        be in the same condition as received, with all included
        accessories.
      </p>
    ),
  },
  {
    id: 'condition-mismatch',
    icon: 'shield',
    title: 'Condition Mismatch Returns',
    body: (
      <>
        <p>
          If the camera you receive doesn&apos;t match its listed condition
          grade, you are eligible for a{' '}
          <strong className="text-repixl-text-light">full refund</strong>.
          This is our commitment to transparent grading.
        </p>
        <p>
          Contact us within 14 days with photos showing the discrepancy.
          We&apos;ll review, issue a prepaid return label, and process your
          refund once the camera is received.
        </p>
        <p>
          <strong className="text-repixl-text-light">
            RePXL covers return shipping
          </strong>{' '}
          for all condition-mismatch returns. You won&apos;t pay a cent.
        </p>
      </>
    ),
  },
  {
    id: 'change-of-mind',
    icon: 'info',
    title: 'Change-of-Mind Returns',
    body: (
      <>
        <p>
          Changed your mind? No problem — returns are accepted within the
          14-day window as long as the camera is in unchanged condition.
        </p>
        <p>
          For change-of-mind returns, the{' '}
          <strong className="text-repixl-text-light">
            buyer covers return shipping costs
          </strong>
          . A restocking fee does not apply.
        </p>
      </>
    ),
  },
  {
    id: 'refund-processing',
    icon: 'refund',
    title: 'Refund Processing',
    body: (
      <>
        <p>
          Refunds are processed within{' '}
          <strong className="text-repixl-text-light">
            5–7 business days
          </strong>{' '}
          of receiving the returned item. The refund is issued to your
          original payment method.
        </p>
        <p>
          You&apos;ll receive email confirmation when your refund is initiated
          and when it&apos;s completed. Allow an additional 1–3 days for your
          bank or payment provider to reflect the credit.
        </p>
      </>
    ),
  },
  {
    id: 'international',
    icon: 'globe',
    title: 'International Shipping',
    body: (
      <>
        <p>
          International shipping is{' '}
          <strong className="text-repixl-text-light">
            not available yet
          </strong>
          . We&apos;re focused on maintaining our packaging and delivery
          standards domestically before expanding internationally.
        </p>
        <p>
          We&apos;re actively working on reliable international logistics
          partnerships. Sign up for our newsletter to be the first to know
          when international orders open.
        </p>
      </>
    ),
  },
]

const icons: Record<string, React.ReactNode> = {
  truck: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  package: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  info: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  refund: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  box: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    </svg>
  ),
}

export default function ShippingReturnsPage() {
  const reducedMotion = useReducedMotion()

  const container = {
    hidden: {},
    show: {
      transition: { staggerChildren: reducedMotion ? 0 : 0.08, delayChildren: reducedMotion ? 0 : 0.1 },
    },
  }
  const chipItem = {
    hidden: reducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.4, ease: 'easeOut' } },
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
            style={{ fontSize: 'clamp(8rem, 16vw, 18rem)' }}
          >
            DELIVERED
          </span>
        </div>

        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Policies
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              <RevealText text="Shipping & Returns" as="span" />
            </h1>
            <motion.p
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.3 }}
              className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70"
            >
              How we pack, ship, and handle returns for vintage cameras that
              deserve careful treatment.
            </motion.p>
          </div>

          {/* Quick facts strip */}
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="mx-auto mt-10 flex max-w-2xl flex-wrap items-center justify-center gap-3"
          >
            {quickFacts.map((fact) => (
              <motion.div
                key={fact.label}
                variants={chipItem}
                className="flex items-center gap-2 rounded-full border border-repixl-muted/15 bg-repixl-charcoal px-4 py-2"
              >
                <span className="text-repixl-red">{icons[fact.icon]}</span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-text-light/80">
                  {fact.label}
                </span>
              </motion.div>
            ))}
          </motion.div>

          {/* Jump nav */}
          <motion.div
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.5 }}
            className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1"
          >
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted underline decoration-repixl-muted/30 underline-offset-4 transition-colors hover:text-repixl-red hover:decoration-repixl-red/40"
              >
                {s.title}
              </a>
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Sections */}
      <section className="pb-24 md:pb-32">
        <Container>
          <div className="mx-auto max-w-2xl space-y-12">
            {sections.map((section) => (
              <motion.div
                key={section.id}
                id={section.id}
                initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: reducedMotion ? 0 : 0.5, ease: 'easeOut' }}
                className="scroll-mt-28"
              >
                <div className="group flex items-center gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-repixl-muted/20 text-repixl-muted transition-colors duration-300 group-hover:border-repixl-red/40 group-hover:text-repixl-red">
                    {icons[section.icon]}
                  </span>
                  <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                    {section.title}
                  </h2>
                </div>
                <div className="mt-4 space-y-3 pl-12 text-sm leading-relaxed text-repixl-text-light/70">
                  {section.body}
                </div>
              </motion.div>
            ))}

            {/* Contact CTA */}
            <motion.div
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
            >
              <CornerBracket size={14} color="rgba(140, 133, 128, 0.25)" className="px-6 py-8 text-center">
                <p className="text-sm text-repixl-text-light/70">
                  Have a question about a specific order or return?
                </p>
                <p className="mt-2 text-sm text-repixl-text-light">
                  Reach us at{' '}
                  <a
                    href="mailto:support@repxl.com"
                    className="text-repixl-red transition-colors hover:text-repixl-red/80"
                  >
                    support@repxl.com
                  </a>{' '}
                  or visit our{' '}
                  <a
                    href="/contact"
                    className="text-repixl-red transition-colors hover:text-repixl-red/80"
                  >
                    Contact page
                  </a>
                  .
                </p>
              </CornerBracket>
            </motion.div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}