'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from './Button'

interface LoginRequiredModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginRequiredModal({ isOpen, onClose }: LoginRequiredModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const overlay = overlayRef.current
    if (!overlay) return

    const firstBtn = overlay.querySelector<HTMLElement>('a, button')
    firstBtn?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab') {
        const focusables = overlay.querySelectorAll<HTMLElement>('a, button, [tabindex]:not([tabindex="-1"])')
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div ref={overlayRef} role="dialog" aria-modal="true" aria-label="Login required" className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-sm rounded-lg border border-repixl-muted/20 bg-repixl-bg p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-repixl-muted hover:bg-repixl-charcoal hover:text-repixl-text-light"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-repixl-charcoal">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h2 className="mt-4 font-display text-lg font-semibold text-repixl-text-light">
            Account required
          </h2>
          <p className="mt-2 text-sm text-repixl-muted">
            Sign in or create an account to continue.
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Link href="/login" onClick={onClose}>
            <Button variant="primary" size="md" className="w-full">Log In</Button>
          </Link>
          <Link href="/register" onClick={onClose}>
            <Button variant="secondary" size="md" className="w-full">Register</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
