'use client'

import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'

export default function ShippingReturnsPage() {
  return (
    <div>
      <section className="pb-20 pt-32 md:pb-28 md:pt-40">
        <Container>
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Policies
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              Shipping &amp; Returns
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70">
              How we pack, ship, and handle returns for vintage cameras that
              deserve careful treatment.
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-2xl space-y-12">
            {/* Shipping */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <rect x="1" y="3" width="15" height="13" />
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Domestic Shipping
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
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
              </div>
            </div>

            {/* Packaging */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                    <line x1="12" y1="22.08" x2="12" y2="12" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Packaging Standards
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
                <p>
                  Vintage electronics are fragile — we package accordingly. Every
                  camera ships with:
                </p>
                <ul className="list-inside list-disc space-y-1.5 text-repixl-text-light/60">
                  <li>Anti-static wrap around the camera body</li>
                  <li>Foam padding on all sides</li>
                  <li>Double-boxed for impact protection</li>
                  <li>Silica gel packets to prevent moisture damage</li>
                  <li>Accessories individually wrapped and secured</li>
                </ul>
                <p>
                  We take the same care shipping a ₱2,000 point-and-shoot as we do
                  a ₱15,000 collector piece.
                </p>
              </div>
            </div>

            {/* Return Window */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Return Window
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
                <p>
                  You have <strong className="text-repixl-text-light">14 days</strong>{' '}
                  from the date of delivery to initiate a return. The camera must
                  be in the same condition as received, with all included
                  accessories.
                </p>
              </div>
            </div>

            {/* Condition Mismatch */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Condition Mismatch Returns
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
                <p>
                  If the camera you receive doesn't match its listed condition
                  grade, you are eligible for a{' '}
                  <strong className="text-repixl-text-light">full refund</strong>.
                  This is our commitment to transparent grading.
                </p>
                <p>
                  Contact us within 14 days with photos showing the discrepancy.
                  We'll review, issue a prepaid return label, and process your
                  refund once the camera is received.
                </p>
                <p>
                  <strong className="text-repixl-text-light">
                    RePXL covers return shipping
                  </strong>{' '}
                  for all condition-mismatch returns. You won't pay a cent.
                </p>
              </div>
            </div>

            {/* Change of Mind */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Change-of-Mind Returns
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
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
              </div>
            </div>

            {/* Refund Processing */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  Refund Processing
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
                <p>
                  Refunds are processed within{' '}
                  <strong className="text-repixl-text-light">
                    5–7 business days
                  </strong>{' '}
                  of receiving the returned item. The refund is issued to your
                  original payment method.
                </p>
                <p>
                  You'll receive email confirmation when your refund is initiated
                  and when it's completed. Allow an additional 1–3 days for your
                  bank or payment provider to reflect the credit.
                </p>
              </div>
            </div>

            {/* International Shipping */}
            <div>
              <div className="flex items-center gap-3">
                <span className="text-repixl-muted">
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
                    <circle cx="12" cy="12" r="10" />
                    <line x1="2" y1="12" x2="22" y2="12" />
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  </svg>
                </span>
                <h2 className="font-display text-lg font-semibold text-repixl-text-light">
                  International Shipping
                </h2>
              </div>
              <div className="mt-4 space-y-3 pl-8 text-sm leading-relaxed text-repixl-text-light/70">
                <p>
                  International shipping is{' '}
                  <strong className="text-repixl-text-light">
                    not available yet
                  </strong>
                  . We're focused on maintaining our packaging and delivery
                  standards domestically before expanding internationally.
                </p>
                <p>
                  We're actively working on reliable international logistics
                  partnerships. Sign up for our newsletter to be the first to know
                  when international orders open.
                </p>
              </div>
            </div>

            {/* Contact CTA */}
            <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 text-center">
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
            </div>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}
