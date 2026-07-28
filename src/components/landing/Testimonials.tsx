'use client'

import { motion } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Testimonial {
  name: string
  quote: string
  rating: number
  camera?: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Mia R.',
    quote:
      'The condition grading is legit — my Coolpix arrived exactly as described. No surprises, just that warm 2004 sensor look I was chasing.',
    rating: 5,
    camera: 'Nikon Coolpix 3200',
  },
  {
    name: 'Jordan T.',
    quote:
      'Finally a place that takes vintage digicams seriously. Serial number verified, multi-angle photos, and it shipped in two days.',
    rating: 5,
    camera: 'Canon PowerShot A520',
  },
  {
    name: 'Alyssa K.',
    quote:
      'Bought a "Good" condition Lumix and it exceeded expectations. The grading system here is honest — I\'ll keep coming back.',
    rating: 4,
    camera: 'Panasonic Lumix DMC-FZ7',
  },
  {
    name: 'Sam D.',
    quote:
      'The compare feature sold me. I was deciding between three CyberShots and could see specs side-by-side before buying.',
    rating: 5,
    camera: 'Sony CyberShot W800',
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className={i < rating ? 'text-repixl-warning' : 'text-repixl-muted/40'}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

export function Testimonials() {
  const reducedMotion = useReducedMotion()

  return (
    <section className="bg-repixl-bg py-24 md:py-36">
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
              — From our collectors
            </span>
            <h2 className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg">
              Trusted by shooters
            </h2>
          </div>

          {/* Testimonial grid */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5"
              >
                <div>
                  <StarRating rating={t.rating} />
                  <p className="mt-3 text-sm leading-relaxed text-repixl-text-light/80">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>

                <div className="mt-5 border-t border-repixl-muted/10 pt-4">
                  <p className="text-sm font-medium text-repixl-text-light">
                    {t.name}
                  </p>
                  {t.camera && (
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
                      Purchased: {t.camera}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  )
}
