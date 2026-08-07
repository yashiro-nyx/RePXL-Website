'use client'

import { Container } from '@/components/layout/Container'
import { Footer } from '@/components/layout/Footer'
import { ConditionBadge } from '@/components/ui'

interface GradeSection {
  condition: 'mint' | 'excellent' | 'good' | 'fair'
  cosmetic: string
  functional: string
  accessories: string
  testing: string
}

const grades: GradeSection[] = [
  {
    condition: 'mint',
    cosmetic:
      'No visible wear, scratches, or marks. Looks brand new. Body panels are immaculate, LCD screen is flawless, and all labeling/text is crisp and unscuffed.',
    functional:
      'All features work perfectly. Sensor clean, lens clear with no fungus or haze, flash fires consistently, zoom operates smoothly, all buttons and dials respond correctly.',
    accessories:
      'Comes with original box, manual, strap, and cables where available. Packaging may show minor shelf wear but is complete.',
    testing:
      '50+ test shots taken across all modes (auto, manual, macro, flash, video where applicable). Battery holds a full charge cycle. Memory card write/read verified.',
  },
  {
    condition: 'excellent',
    cosmetic:
      'Minimal signs of use — light handling marks only visible under direct light. No scratches visible at arm\'s length. LCD and lens surfaces are clean and clear.',
    functional:
      'All features work correctly. Sensor clean, minor dust particles may be present but are non-visible in photos at any aperture. All mechanical operations smooth.',
    accessories:
      'May not include original box. Camera, battery, and memory card included. Strap or cables included when available.',
    testing:
      'Full function test across all shooting modes. Battery holds charge for a normal use session (100+ shots). No operational quirks detected.',
  },
  {
    condition: 'good',
    cosmetic:
      'Visible signs of regular use — light scratches on body, minor paint wear on edges and corners. LCD may have light surface marks but is fully functional. Shows its history without being damaged.',
    functional:
      'All core features work. May have minor quirks noted in listing (e.g., slightly sticky zoom ring, slow focus in low light, minor viewfinder dust). These are always documented honestly.',
    accessories:
      'Camera and battery included. Memory card may not be included. Original packaging and manuals are not included unless noted.',
    testing:
      'Core functions tested across primary shooting modes. Quirks documented honestly with examples. Battery holds charge for basic use.',
  },
  {
    condition: 'fair',
    cosmetic:
      'Noticeable wear — scratches, scuffs, paint loss on edges and grip areas. Shows its age clearly. LCD may have minor blemishes. Body is structurally sound but visibly used.',
    functional:
      'Works but with documented limitations (e.g., flash intermittent, LCD has dead pixels, battery holds reduced charge, certain modes unreliable). All limitations are clearly described in the listing.',
    accessories:
      'Camera body only unless otherwise noted. Battery included if the camera cannot function without one. No guarantee of original accessories.',
    testing:
      'Tested to confirm basic operation and document all limitations clearly. Each limitation is photographed or described with specific detail so buyers know exactly what to expect.',
  },
]

export default function ConditionGradingPage() {
  return (
    <div>
      <section className="pb-20 pt-32 md:pb-28 md:pt-40">
        <Container>
          {/* Header */}
          <div className="mx-auto max-w-2xl text-center">
            <span className="mb-5 block font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — Our Standard
            </span>
            <h1 className="font-display text-display-lg text-repixl-text-light md:text-display-xl">
              Condition Grading
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-sm text-repixl-text-light/70">
              Every camera on RePXL is assessed against the same four-tier
              standard. No guesswork, no seller optimism — just honest,
              consistent grading you can trust.
            </p>
          </div>

          {/* Badge Display */}
          <div className="mx-auto mt-10 flex flex-wrap items-center justify-center gap-3">
            <ConditionBadge condition="mint" />
            <ConditionBadge condition="excellent" />
            <ConditionBadge condition="good" />
            <ConditionBadge condition="fair" />
          </div>

          {/* Grade Sections */}
          <div className="mx-auto mt-16 max-w-3xl space-y-12">
            {grades.map((grade) => (
              <div
                key={grade.condition}
                className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 md:p-8"
              >
                <div className="flex items-center gap-3">
                  <ConditionBadge condition={grade.condition} />
                  <h2 className="font-display text-lg font-semibold capitalize text-repixl-text-light">
                    {grade.condition}
                  </h2>
                </div>

                <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <GradeDetail
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <circle cx="12" cy="12" r="4" />
                        <line x1="21.17" y1="8" x2="12" y2="8" />
                        <line x1="3.95" y1="6.06" x2="8.54" y2="14" />
                        <line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                      </svg>
                    }
                    label="Cosmetic"
                    description={grade.cosmetic}
                  />
                  <GradeDetail
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                    }
                    label="Functional"
                    description={grade.functional}
                  />
                  <GradeDetail
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                      </svg>
                    }
                    label="Accessories"
                    description={grade.accessories}
                  />
                  <GradeDetail
                    icon={
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    }
                    label="Testing"
                    description={grade.testing}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Note */}
          <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 text-center">
            <div className="mx-auto mb-3 text-repixl-muted">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mx-auto"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className="font-display text-sm font-semibold text-repixl-text-light">
              Our Guarantee
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-repixl-text-light/60">
              If a camera you receive doesn&apos;t match its listed condition grade,
              you&apos;re eligible for a full refund within 14 days. We cover return
              shipping for condition mismatches — no questions asked. Read our full{' '}
              <a
                href="/shipping-returns"
                className="text-repixl-red transition-colors hover:text-repixl-red/80"
              >
                Shipping &amp; Returns policy
              </a>
              .
            </p>
          </div>
        </Container>
      </section>

      <Footer />
    </div>
  )
}

function GradeDetail({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode
  label: string
  description: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <span className="text-repixl-muted">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
          {label}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-repixl-text-light/70">
        {description}
      </p>
    </div>
  )
}
