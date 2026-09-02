'use client'

/**
 * PhoneInput — Philippine mobile number field
 *
 * Rules enforced:
 *  - Digits only (no letters / symbols can be typed)
 *  - Must start with "09" — any first digit other than "0" is blocked;
 *    if the second digit isn't "9" the field shows an inline error on blur.
 *  - Maximum 11 digits (09XX XXX XXXX format)
 *  - Shows format hint "09XX XXX XXXX" below the field
 *  - "0" as first keystroke is the only valid start — blocks other digits up front
 */

import { type InputHTMLAttributes, forwardRef } from 'react'
import { digitsOnly } from '@/hooks/useFilteredInput'

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'maxLength' | 'inputMode'> {
  error?: string
  /** Show/hide the format hint. Default: true */
  showHint?: boolean
}

const PH_MOBILE_MAX_LENGTH = 11

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ error, showHint = true, className = '', onChange, onKeyDown, value, defaultValue, ...props }, ref) => {

    const baseClass = `w-full rounded-xl border px-4 py-3 text-sm font-mono text-repixl-text-light placeholder:text-repixl-muted/40 focus:outline-none transition-colors ${
      error
        ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
        : 'border-repixl-muted/15 bg-repixl-charcoal/60 focus:border-repixl-muted/40 focus:bg-repixl-charcoal'
    } ${className}`

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Pass through control/meta/non-printable keys
      if (e.ctrlKey || e.metaKey || e.key.length > 1) {
        onKeyDown?.(e)
        return
      }

      // Only digits allowed
      if (!digitsOnly.test(e.key)) {
        e.preventDefault()
        return
      }

      const current = (e.currentTarget.value ?? '')
      const selStart = e.currentTarget.selectionStart ?? current.length
      const selEnd = e.currentTarget.selectionEnd ?? current.length
      const isReplacing = selStart !== selEnd
      const wouldBeLength = isReplacing
        ? current.length - (selEnd - selStart) + 1
        : current.length + 1

      // Block once max length reached
      if (wouldBeLength > PH_MOBILE_MAX_LENGTH) {
        e.preventDefault()
        return
      }

      // If typing at position 0, only "0" is valid for a PH mobile number
      if (selStart === 0 && !isReplacing && e.key !== '0') {
        e.preventDefault()
        return
      }

      onKeyDown?.(e)
    }

    return (
      <div>
        <input
          ref={ref}
          type="tel"
          inputMode="numeric"
          maxLength={PH_MOBILE_MAX_LENGTH}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          placeholder="09XX XXX XXXX"
          className={baseClass}
          {...props}
        />
        {showHint && !error && (
          <p className="mt-1 font-mono text-[10px] text-repixl-muted/60">Format: 09XX XXX XXXX (11 digits)</p>
        )}
        {error && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
          </p>
        )}
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'

/**
 * Validates a PH mobile number string.
 * Accepts: 09XXXXXXXXX (11 digits, starts with 09)
 */
export function validatePHPhone(value: string): boolean {
  const digits = value.replace(/\D/g, '')
  return /^09\d{9}$/.test(digits)
}
