'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { RevealText } from '@/components/ui'
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
      "Bought a \"Good\" condition Lumix and it exceeded expectations. The grading system here is honest — I'll keep coming back.",
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
    <div className="flex justify-center gap-1" aria-label={`${rating} out of 5 stars`}>
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
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)
  const sectionRef = useRef<HTMLDivElement>(null)

  // Scroll-linked parallax — same pattern as EditorialSection: the oversized
  // watermark glyph and the header both drift at different speeds as the
  // section passes through the viewport.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  const watermarkY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [-50, 70])
  const headerY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [30, -30])

  const goTo = useCallback(
    (i: number) => {
      setDirection(i > index ? 1 : -1)
      setIndex((i + testimonials.length) % testimonials.length)
    },
    [index]
  )

  const next = useCallback(() => goTo(index + 1), [goTo, index])
  const prev = useCallback(() => goTo(index - 1), [goTo, index])

  // Autoplay
  useEffect(() => {
    if (reducedMotion) return
    const timer = setInterval(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % testimonials.length)
    }, 7000)
    return () => clearInterval(timer)
  }, [reducedMotion])

  const active = testimonials[index]

  const variants = {
    enter: (dir: number) => (reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: dir * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => (reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: dir * -40 }),
  }

  return (
    <section ref={sectionRef} className="relative overflow-hidden py-28 md:py-40">
      {/* Oversized watermark quote mark, drifting on scroll like the Hero's VINTAGE watermark */}
      <motion.div
        style={{ y: watermarkY }}
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex select-none justify-center"
        aria-hidden="true"
      >
        <span
          className="font-display font-bold leading-none text-white/[0.04]"
          style={{ fontSize: 'clamp(14rem, 26vw, 30rem)' }}
        >
          &ldquo;
        </span>
      </motion.div>

      <Container>
        <motion.div style={{ y: headerY }} className="mb-12 text-center md:mb-16">
          <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
            — From our collectors
          </span>
          <RevealText
            as="h2"
            text="Trusted by shooters"
            className="mt-3 font-display text-display-md text-repixl-text-light md:text-display-lg"
          />
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={index}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex min-h-[220px] flex-col items-center gap-6 text-center md:min-h-[180px]"
            >
              <p className="font-display text-2xl italic leading-snug text-repixl-text-light md:text-4xl">
                &ldquo;{active.quote}&rdquo;
              </p>

              <div className="flex flex-col items-center gap-2">
                <StarRating rating={active.rating} />
                <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
                  {active.name}
                  {active.camera && <> · {active.camera}</>}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Controls */}
          <div className="mt-12 flex items-center justify-center gap-6">
            <button
              onClick={prev}
              aria-label="Previous testimonial"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-repixl-muted/30 text-repixl-text-light/60 transition-colors hover:border-repixl-text-light hover:text-repixl-text-light"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>

            <div className="flex items-center gap-2">
              {testimonials.map((t, i) => (
                <button
                  key={t.name}
                  onClick={() => goTo(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === index ? 'w-6 bg-repixl-red' : 'w-1.5 bg-repixl-muted/30 hover:bg-repixl-muted/50'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={next}
              aria-label="Next testimonial"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-repixl-muted/30 text-repixl-text-light/60 transition-colors hover:border-repixl-text-light hover:text-repixl-text-light"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
      </Container>
    </section>
  )
}