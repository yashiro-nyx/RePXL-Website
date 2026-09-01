'use client'

import { useEffect, useRef } from 'react'
import { Button } from './Button'
import { useScrollLock } from '@/hooks/useScrollLock'

interface LogoutConfirmModalProps {
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
}

/**
 * LogoutConfirmModal — shown when the user clicks "Log Out" in the nav dropdown.
 * Asks for explicit confirmation before executing the logout action.
 */
export function LogoutConfirmModal({ isOpen, onCancel, onConfirm }: LogoutConfirmModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useScrollLock(isOpen)

  useEffect(() => {
    if (!isOpen) return

    const overlay = overlayRef.current
    if (!overlay) return

    // Focus the Cancel button by default — the safe action is immediately reachable
    const cancelBtn = overlay.querySelector<HTMLElement>('[data-cancel]')
    cancelBtn?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return }
      if (e.key === 'Tab') {
        const focusables = overlay.querySelectorAll<HTMLElement>(
          'button, [tabindex]:not([tabindex="-1"])'
        )
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    /* Full-viewport overlay — fixed + flex center both axes */
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panel — relative so it layers above the backdrop */}
      <div className="relative w-full max-w-sm rounded-lg border border-repixl-muted/20 bg-repixl-bg p-6 shadow-2xl">

        {/* Close × */}
        <button
          type="button"
          onClick={onCancel}
          aria-label="Cancel and close"
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-repixl-muted transition-colors hover:bg-repixl-charcoal hover:text-repixl-text-light"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18" /><path d="m6 6 12 12" />
          </svg>
        </button>

        {/* Icon — centered */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-repixl-charcoal">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-repixl-red"
              aria-hidden="true"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </div>
        </div>

        {/* Copy — centered */}
        <div className="mt-4 text-center">
          <h2
            id="logout-modal-title"
            className="font-display text-lg font-semibold text-repixl-text-light"
          >
            Log out?
          </h2>
          <p className="mt-2 text-sm text-repixl-muted">
            You&rsquo;ll need to sign in again to access your account, cart, and wishlist.
          </p>
        </div>

        {/* Actions — two equal-width buttons, centered as a group */}
        <div className="mt-6 flex items-center justify-center gap-3">
          <Button
            data-cancel
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onCancel}
            aria-label="Cancel and stay signed in"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onConfirm}
            aria-label="Confirm log out"
          >
            Log Out
          </Button>
        </div>
      </div>
    </div>
  )
}
