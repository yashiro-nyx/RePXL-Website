'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button'
import { useScrollLock } from '@/hooks/useScrollLock'

interface LegalModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  content: string
  /** If provided, shows an "I Agree" button that enables once scrolled to bottom */
  onAgree?: () => void
}

export function LegalModal({ isOpen, onClose, title, content, onAgree }: LegalModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)
  const [scrolledToBottom, setScrolledToBottom] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render portal on the client
  useEffect(() => { setMounted(true) }, [])

  useScrollLock(isOpen)

  // Track what triggered the modal so we can return focus
  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement
      setScrolledToBottom(false)
    }
  }, [isOpen])

  // Focus trap + escape key
  useEffect(() => {
    if (!isOpen) return

    const overlay = overlayRef.current
    if (!overlay) return

    const firstFocusable = overlay.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }

      if (e.key === 'Tab') {
        const focusables = overlay.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusables[0]
        const last = focusables[focusables.length - 1]

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      triggerRef.current?.focus()
    }
  }, [isOpen, onClose])

  // Track scroll position in content area
  const handleScroll = useCallback(() => {
    const el = contentRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30
    if (isAtBottom && !scrolledToBottom) {
      setScrolledToBottom(true)
    }
  }, [scrolledToBottom])

  // Check if content fits without scrolling (already "at bottom")
  useEffect(() => {
    if (!isOpen) return
    const el = contentRef.current
    if (!el) return
    const timer = setTimeout(() => {
      if (el.scrollHeight <= el.clientHeight + 30) {
        setScrolledToBottom(true)
      }
    }, 50)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!isOpen || !mounted) return null

  // Simple markdown-to-HTML (handles ##, ###, **, -, and line breaks)
  const renderContent = (md: string) => {
    return md.split('\n').map((line, i) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('### ')) {
        return <h3 key={i} className="mb-2 mt-6 font-display text-sm font-semibold text-repixl-text-light">{trimmed.slice(4)}</h3>
      }
      if (trimmed.startsWith('## ')) {
        return <h2 key={i} className="mb-3 font-display text-lg font-semibold text-repixl-text-light">{trimmed.slice(3)}</h2>
      }
      if (trimmed.startsWith('- ')) {
        return (
          <li key={i} className="ml-4 list-disc text-sm leading-relaxed text-repixl-text-light/70"
            dangerouslySetInnerHTML={{ __html: boldify(trimmed.slice(2)) }} />
        )
      }
      if (trimmed === '') return <div key={i} className="h-2" />

      return (
        <p key={i} className="text-sm leading-relaxed text-repixl-text-light/70"
          dangerouslySetInnerHTML={{ __html: boldify(trimmed) }} />
      )
    })
  }

  const handleAgree = () => {
    onAgree?.()
    onClose()
  }

  /**
   * Rendered via createPortal so it always mounts on document.body,
   * escaping any parent stacking context (Framer Motion transforms,
   * overflow-hidden panels, etc.) that would clip a fixed overlay.
   */
  return createPortal(
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6"
    >
      {/* Backdrop — covers the entire viewport */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-repixl-muted/20 bg-repixl-bg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-repixl-text-light">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-repixl-muted transition-colors hover:bg-repixl-charcoal hover:text-repixl-text-light"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" /><path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={contentRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5"
        >
          {renderContent(content)}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-repixl-muted/10 px-6 py-4">
          {onAgree ? (
            <>
              <p className="text-[10px] text-repixl-muted">
                {scrolledToBottom
                  ? 'You\u2019ve read the full document.'
                  : 'Scroll to the bottom to enable agreement.'}
              </p>
              <Button
                variant="primary"
                size="md"
                onClick={handleAgree}
                disabled={!scrolledToBottom}
              >
                I Agree
              </Button>
            </>
          ) : (
            <>
              <span />
              <Button variant="secondary" size="md" onClick={onClose}>
                Close
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Simple bold markdown replacement */
function boldify(text: string): string {
  return text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-repixl-text-light font-medium">$1</strong>')
}
