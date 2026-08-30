'use client'

import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

// Predefine motion tag variants at module scope (not inside the render
// function) so React doesn't treat them as a new component type on every
// render, which would remount the DOM node and reset the animation.
const TAG_MAP = {
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  h4: motion.h4,
  p: motion.p,
  span: motion.span,
  div: motion.div,
} as const

type RevealTag = keyof typeof TAG_MAP

export interface RevealTextProps {
  /** Plain text to reveal, split and staggered word by word. */
  text: string
  /** Element to render as. Defaults to 'span'. */
  as?: RevealTag
  className?: string
  /** Delay, in seconds, before the stagger starts. */
  delay?: number
  /** Delay, in seconds, between each word's animation start. */
  stagger?: number
  /**
   * Whether the reveal only plays once. Defaults to false so the text
   * re-animates every time it re-enters the viewport — scrolling down
   * *and* scrolling back up.
   */
  once?: boolean
  /** Intersection margin — how far into/before the viewport to trigger. */
  viewportMargin?: string
}

/**
 * Splits `text` into words and reveals them with a staggered
 * fade-up-through-a-mask animation, triggered by scroll position.
 *
 * For headings that need inline formatting (colored spans, <br/>, italics),
 * don't use this — hand-roll the same word/segment-span pattern directly
 * in the component so the markup stays intact.
 */
export function RevealText({
  text,
  as = 'span',
  className = '',
  delay = 0,
  stagger = 0.035,
  once = false,
  viewportMargin = '-10% 0px',
}: RevealTextProps) {
  const reducedMotion = useReducedMotion()
  const words = text.split(' ')
  const MotionTag = TAG_MAP[as]

  const container = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: reducedMotion ? 0 : stagger,
        delayChildren: reducedMotion ? 0 : delay,
      },
    },
  }

  const word = {
    hidden: reducedMotion ? { y: 0, opacity: 1 } : { y: '110%', opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: { duration: reducedMotion ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] },
    },
  }

  return (
    // @ts-expect-error — variants/initial/whileInView are valid on every tag in TAG_MAP
    <MotionTag
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: viewportMargin }}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.1em]" style={{ verticalAlign: 'bottom' }}>
          {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
          <motion.span variants={word} className="inline-block">
            {w}
            {i !== words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}
