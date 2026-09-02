'use client'

/**
 * CardExpiryInput — auto-formats card expiry as "MM/YY"
 *
 * • Only digits can be typed.
 * • After the user types the 2nd digit, "/" is auto-inserted so the year
 *   appends naturally — typing "1228" displays as "12/28".
 * • Month is validated as 01–12; if the first digit is > 1, it's treated
 *   as a single-digit month (e.g. "2" becomes "02/") automatically.
 * • Max 4 digits (MM + YY). The displayed value is up to 5 chars with the "/".
 * • Backspace across "/" is natural: pressing backspace right after the "/"
 *   removes the "2nd month digit" (or the first if month was single char),
 *   not the slash itself.
 * • `onChange` is called with the formatted display string (e.g. "12/28").
 *   The parent is responsible for splitting on "/" to get expMonth / expYear
 *   before sending to PayMongo.
 */

import { forwardRef, type InputHTMLAttributes } from 'react'

interface CardExpiryInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'maxLength' | 'inputMode'> {
  /** Formatted display value e.g. "12/28". Controlled by parent. */
  value: string
  /** Called with the formatted display string on every change. */
  onChange: (formatted: string) => void
  error?: string
  className?: string
}

export const CardExpiryInput = forwardRef<HTMLInputElement, CardExpiryInputProps>(
  ({ value, onChange, error, className = '', ...props }, ref) => {

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow control/meta and non-printable
      if (e.ctrlKey || e.metaKey || e.key.length > 1) return
      // Block non-digits
      if (!/^\d$/.test(e.key)) { e.preventDefault(); return }

      const current = value
      const digits = current.replace(/\D/g, '')

      // Already at 4 raw digits — block more input
      if (digits.length >= 4) { e.preventDefault() }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value

      // Strip everything except digits
      let digits = raw.replace(/\D/g, '').slice(0, 4)

      if (digits.length === 0) {
        onChange('')
        return
      }

      // Month auto-correction: first digit > 1 → prefix "0"
      // e.g. user types "9" → treat as "09/"
      if (digits.length === 1 && parseInt(digits[0], 10) > 1) {
        digits = '0' + digits
      }

      // Validate month portion (01–12) when we have at least 2 digits
      if (digits.length >= 2) {
        const month = parseInt(digits.slice(0, 2), 10)
        if (month < 1) digits = '01' + digits.slice(2)
        if (month > 12) digits = '12' + digits.slice(2)
      }

      // Build formatted display value
      let formatted: string
      if (digits.length <= 2) {
        formatted = digits
        // Auto-append "/" once month is complete
        if (digits.length === 2) formatted = digits + '/'
      } else {
        formatted = digits.slice(0, 2) + '/' + digits.slice(2)
      }

      onChange(formatted)
    }

    return (
      <div>
        <input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="cc-exp"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          maxLength={5} /* MM/YY */
          placeholder="MM/YY"
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

CardExpiryInput.displayName = 'CardExpiryInput'
