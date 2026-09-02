'use client'

/**
 * CardNumberInput — auto-formats card number as "XXXX XXXX XXXX XXXX"
 *
 * • Only digits can be typed (all other keystrokes blocked).
 * • Spaces are inserted automatically every 4 digits as the user types.
 * • Max 16 digits (Visa / Mastercard). Amex (15-digit 4-6-5) is not
 *   currently in scope — PayMongo test cards are Visa/MC only.
 * • Backspace is natural: deleting a digit also removes an orphaned
 *   trailing space if the cursor lands right after one.
 * • The `onChange` callback always receives the RAW digit string (no
 *   spaces) so the parent can send it directly to PayMongo.
 * • The `displayValue` is kept in local state and shown in the input.
 */

import { forwardRef, useState, type InputHTMLAttributes } from 'react'

interface CardNumberInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'maxLength' | 'inputMode'> {
  /** Current raw digit string (no spaces). Controlled by parent. */
  value: string
  /** Called with the raw digit string on every change. */
  onChange: (raw: string) => void
  error?: string
  className?: string
}

/** Format 16 raw digits → "XXXX XXXX XXXX XXXX" */
function formatCardNumber(digits: string): string {
  return digits
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
}

export const CardNumberInput = forwardRef<HTMLInputElement, CardNumberInputProps>(
  ({ value, onChange, error, className = '', ...props }, ref) => {
    const displayValue = formatCardNumber(value)

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow control/meta keys and non-printable keys
      if (e.ctrlKey || e.metaKey || e.key.length > 1) return
      // Block anything that isn't a digit
      if (!/^\d$/.test(e.key)) { e.preventDefault(); return }
      // Block if already at 16 raw digits
      if (value.length >= 16) { e.preventDefault() }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip all non-digits from whatever the browser produced
      const raw = e.target.value.replace(/\D/g, '').slice(0, 16)
      onChange(raw)
      // Restore formatted cursor position
      const formatted = formatCardNumber(raw)
      // Schedule cursor restoration after React re-render
      const input = e.target
      const rawCursorAfter = raw.length
      // Each group of 4 digits is followed by a space; count how many spaces precede cursor
      const spacesBeforeCursor = Math.floor(rawCursorAfter / 4)
      const cursorPos = rawCursorAfter + spacesBeforeCursor
      requestAnimationFrame(() => {
        // Don't overshoot the actual string length
        const safe = Math.min(cursorPos, formatted.length)
        input.setSelectionRange(safe, safe)
      })
    }

    return (
      <div>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          value={displayValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={19} /* 16 digits + 3 spaces */
          placeholder="1234 5678 9012 3456"
          className={className}
          {...props}
        />
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)

CardNumberInput.displayName = 'CardNumberInput'
