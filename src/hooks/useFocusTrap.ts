import { useEffect } from 'react'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface UseFocusTrapOptions {
  active: boolean
  containerRef: React.RefObject<HTMLElement | null>
  initialFocusSelector?: string
  restoreFocusRef?: React.RefObject<HTMLElement | null>
}

/** Keeps focus inside an open dialog/sheet and restores it on close. */
export function useFocusTrap({
  active,
  containerRef,
  initialFocusSelector,
  restoreFocusRef,
}: UseFocusTrapOptions) {
  useEffect(() => {
    if (!active) return
    const container = containerRef.current
    if (!container) return

    const previousFocus = restoreFocusRef?.current ?? (document.activeElement as HTMLElement | null)
    const getFocusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    const focusInitial = () => {
      const target = initialFocusSelector
        ? container.querySelector<HTMLElement>(initialFocusSelector)
        : getFocusable()[0]
      target?.focus()
    }
    const frame = window.requestAnimationFrame(focusInitial)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusables = getFocusable()
      if (focusables.length === 0) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    const handleFocusIn = (event: FocusEvent) => {
      if (!container.contains(event.target as Node)) focusInitial()
    }

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('focusin', handleFocusIn)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('focusin', handleFocusIn)
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [active, containerRef, initialFocusSelector, restoreFocusRef])
}
