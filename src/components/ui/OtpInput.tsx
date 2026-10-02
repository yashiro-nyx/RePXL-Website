'use client'

import { useId, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import {
  typeDigit,
  pasteDigits,
  backspace,
  deleteAt,
  moveFocus,
  type OtpTransition,
} from '@/lib/otp-input-logic'

export interface OtpInputProps {
  /** The current code as a single string (e.g. "1234" while typing "123456"). */
  value: string
  /** Called with the new full string whenever it changes. */
  onChange: (value: string) => void
  /** Number of digit boxes. Defaults to 6. */
  length?: number
  /** Called once the code reaches full length (e.g. to auto-submit). */
  onComplete?: (value: string) => void
  disabled?: boolean
  /** Marks the group invalid for assistive tech + styling. */
  error?: boolean
  autoFocus?: boolean
  /** Accessible group label. Defaults to "6-digit verification code". */
  ariaLabel?: string
  /** id of an element describing errors, wired to aria-describedby. */
  describedById?: string
}

/**
 * Accessible one-time-code input rendered as N separate digit boxes but
 * representing ONE logical numeric code.
 *
 * - Numeric only; non-digits are rejected on type and stripped on paste.
 * - Typing auto-advances; Backspace clears the current box or moves back;
 *   ArrowLeft/Right navigate; clicking selects a position.
 * - Pasting "123456" into ANY box distributes across all boxes.
 * - `inputMode="numeric"` + `autoComplete="one-time-code"` enable mobile
 *   keypad + SMS/authenticator autofill. `type="text"` (not "number") avoids
 *   spinner/format quirks.
 * - Exposed to screen readers as a single labelled group; each box is a
 *   spinbutton-free text field, and the group carries the "verification code"
 *   label so it reads as one code, not confusing unlabelled boxes.
 */
export function OtpInput({
  value,
  onChange,
  length = 6,
  onComplete,
  disabled = false,
  error = false,
  autoFocus = false,
  ariaLabel,
  describedById,
}: OtpInputProps) {
  const groupId = useId()
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])

  const digits = value.slice(0, length).split('').map((digit) => digit.trim())
  const label = ariaLabel ?? `${length}-digit verification code`

  const focusBox = (i: number) => {
    const el = inputsRef.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }

  const apply = (t: OtpTransition) => {
    onChange(t.value)
    focusBox(t.focus)
    if (t.complete && t.value !== value) onComplete?.(t.value)
  }

  const handleChange = (index: number, raw: string) => {
    apply(typeDigit(value, index, raw, length))
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      apply(backspace(value, index, length))
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(moveFocus(index, -1, length))
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(moveFocus(index, 1, length))
    } else if (e.key === 'Delete') {
      e.preventDefault()
      apply(deleteAt(value, index, length))
    }
  }

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    if (!/\d/.test(pasted)) return
    apply(pasteDigits(value, index, pasted, length))
  }

  return (
    <div
      role="group"
      aria-label={label}
      aria-describedby={describedById}
      className="flex items-center gap-2"
    >
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el }}
          id={`${groupId}-${i}`}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          pattern="[0-9]*"
          maxLength={length}
          value={digits[i] ?? ''}
          disabled={disabled}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1} of ${length}`}
          aria-invalid={error || undefined}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.currentTarget.select()}
          className={[
            'h-12 w-11 rounded-xl border bg-repixl-bg text-center font-mono text-xl text-repixl-text-light transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/50',
            error
              ? 'border-red-400/60 focus:border-red-400'
              : 'border-repixl-muted/25 focus:border-repixl-muted/50',
            disabled ? 'opacity-50' : '',
          ].join(' ')}
        />
      ))}
    </div>
  )
}
