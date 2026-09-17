'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { RevealText } from './RevealText'
import { useReducedMotion } from '@/hooks/useReducedMotion'

export interface SectionHeaderProps {
  /** Small uppercase category/context label */
  eyebrow: string
  /** Primary headline for the section */
  title: string
  /** Optional word within the title to style in red accent */
  highlightWord?: string
  /** Optional descriptive paragraph below the title */
  description?: string
  /** Layout alignment: centered (default) or left-aligned */
  align?: 'center' | 'left'
  /** Additional wrapper classes */
  className?: string
  /** Heading semantic tag. Defaults to 'h2' */
  as?: 'h2' | 'h3'
  /** Optional custom children underneath description */
  children?: React.ReactNode
}

export function SectionHeader({
  eyebrow,
  title,
  highlightWord,
  description,
  align = 'center',
  className = '',
  as = 'h2',
  children,
}: SectionHeaderProps) {
  const reducedMotion = useReducedMotion()

  return (
    <motion.div
      initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false, margin: '-60px' }}
      transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
      className={`flex flex-col gap-2.5 ${
        align === 'center' ? 'items-center text-center' : 'items-start text-left'
      } ${className}`}
    >
      {/* Eyebrow matching reference styling */}
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs uppercase tracking-widest text-[#EF4444]">
          — {eyebrow}
        </span>
      </div>

      {/* Main heading — strictly preserves original RePXL typography */}
      <RevealText
        as={as}
        text={title}
        highlightWord={highlightWord}
        className="font-display text-display-md text-repixl-text-light md:text-display-lg"
      />

      {/* Optional description */}
      {description && (
        <p className="max-w-lg text-sm leading-relaxed text-repixl-text-light/65">
          {description}
        </p>
      )}

      {children}
    </motion.div>
  )
}

