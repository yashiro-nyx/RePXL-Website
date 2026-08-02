'use client'

import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { Container } from '@/components/layout/Container'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export function EditorialSection() {
  const reducedMotion = useReducedMotion()
  const sectionRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })

  // Parallax: text moves slower, images move faster (opposite directions)
  const textY = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [60, -60])
  const img1Y = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [40, -100])
  const img2Y = useTransform(scrollYProgress, [0, 1], reducedMotion ? [0, 0] : [80, -40])

  // Fade in on scroll
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])
  const staticOpacity = reducedMotion ? 1 : undefined

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden py-32 md:py-48"
    >
      <Container className="relative">
        <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:gap-8">
          {/* Left: layered/stacked imagery */}
          <div className="relative flex items-center justify-center md:col-span-5">
            <div className="relative h-[420px] w-full max-w-[360px] md:h-[500px]">
              {/* Back image — moves at different speed */}
              <motion.div
                style={{ y: reducedMotion ? 0 : img1Y }}
                className="absolute left-0 top-8 z-0 w-[75%]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/editorial-1.svg"
                  alt="Vintage Canon PowerShot — editorial"
                  className="h-auto w-full rounded-lg opacity-70"
                />
              </motion.div>

              {/* Front image — overlaps, moves at its own speed */}
              <motion.div
                style={{ y: reducedMotion ? 0 : img2Y }}
                className="absolute bottom-0 right-0 z-10 w-[70%]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/editorial-2.svg"
                  alt="Vintage Nikon Coolpix — editorial"
                  className="h-auto w-full rounded-lg shadow-2xl"
                />
              </motion.div>

              {/* Decorative bracket accent on the image stack */}
              <div
                className="absolute -left-3 -top-3 z-20 h-16 w-16"
                aria-hidden="true"
                style={{
                  borderLeft: '1px solid rgba(140, 133, 128, 0.3)',
                  borderTop: '1px solid rgba(140, 133, 128, 0.3)',
                }}
              />
              <div
                className="absolute -bottom-3 -right-3 z-20 h-16 w-16"
                aria-hidden="true"
                style={{
                  borderRight: '1px solid rgba(140, 133, 128, 0.3)',
                  borderBottom: '1px solid rgba(140, 133, 128, 0.3)',
                }}
              />
            </div>
          </div>

          {/* Right: large editorial typography — parallax text */}
          <motion.div
            style={{
              y: reducedMotion ? 0 : textY,
              opacity: staticOpacity ?? opacity,
            }}
            className="flex flex-col gap-8 md:col-span-7 md:pl-8"
          >
            <span className="font-mono text-xs uppercase tracking-widest text-repixl-muted">
              — The digicam era
            </span>

            <h2 className="font-display text-display-lg leading-tight text-repixl-text-light md:text-display-xl">
              Before filters,
              <br />
              there was{' '}
              <span className="italic text-repixl-rose">film-tone</span>
              <br />
              at ISO 100.
            </h2>

            <p className="max-w-lg text-base leading-relaxed text-repixl-text-light/60">
              Two megapixels. A fixed lens. No post-processing. The early
              2000s gave us cameras that captured light with an honesty that
              no preset can replicate — warm grain, crushed shadows, and
              colors that felt like memory. We collect them so you can shoot
              that way again.
            </p>

            {/* Monospace spec callout */}
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-repixl-muted/20" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">
                2MP · 3× Zoom · CompactFlash · 2003–2007
              </span>
              <span className="h-px flex-1 bg-repixl-muted/20" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </Container>
    </section>
  )
}
