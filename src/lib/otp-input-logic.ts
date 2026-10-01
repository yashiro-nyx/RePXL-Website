/**
 * Pure transition logic for the segmented OTP input (framework-free, testable).
 *
 * The OTP is one logical numeric string; these helpers compute the next string
 * and where focus should land, given a keystroke/paste at a box index. The React
 * component (`OtpInput`) is a thin shell over these.
 */

export const OTP_DEFAULT_LENGTH = 6

/** Keep digits only, capped to `length`. */
export function sanitizeOtp(raw: string, length = OTP_DEFAULT_LENGTH): string {
  return raw.replace(/\D/g, '').slice(0, length)
}

function toArray(value: string, length: number): string[] {
  const clean = value.replace(/[^0-9 ]/g, '').slice(0, length).split('').map((digit) => digit.trim())
  return Array.from({ length }, (_, i) => clean[i] ?? '')
}

export interface OtpTransition {
  /** The new full OTP string. */
  value: string
  /** The box index that should receive focus next. */
  focus: number
  /** True when the code reached full length. */
  complete: boolean
}

/**
 * Handle typing into box `index`. Supports a single digit (place + advance) and
 * multi-char input (e.g. autofill dropping the whole code into one box →
 * distribute). Non-digits are ignored.
 */
export function typeDigit(value: string, index: number, raw: string, length = OTP_DEFAULT_LENGTH): OtpTransition {
  const arr = toArray(value, length)
  const digits = raw.replace(/\D/g, '')

  if (digits.length === 0) {
    // Non-digit keystroke — no change.
    return finalize(arr, index, length)
  }

  let cursor = digits.length >= length ? 0 : index
  for (const ch of digits) {
    if (cursor >= length) break
    arr[cursor] = ch
    cursor++
  }
  return finalize(arr, Math.min(cursor, length - 1), length)
}

/** Distribute a pasted string starting at `index`. */
export function pasteDigits(value: string, index: number, pasted: string, length = OTP_DEFAULT_LENGTH): OtpTransition {
  return typeDigit(value, index, pasted, length)
}

/**
 * Backspace at box `index`: if the box has a digit, clear it (stay); if empty,
 * clear the previous box and move focus back.
 */
export function backspace(value: string, index: number, length = OTP_DEFAULT_LENGTH): OtpTransition {
  const arr = toArray(value, length)
  if (arr[index]) {
    arr[index] = ''
    return finalize(arr, index, length)
  }
  if (index > 0) {
    arr[index - 1] = ''
    return finalize(arr, index - 1, length)
  }
  return finalize(arr, 0, length)
}

/** Delete key: clear the current box, keep focus. */
export function deleteAt(value: string, index: number, length = OTP_DEFAULT_LENGTH): OtpTransition {
  const arr = toArray(value, length)
  arr[index] = ''
  return finalize(arr, index, length)
}

/** Clamp an arrow-key move into [0, length-1]. */
export function moveFocus(index: number, delta: number, length = OTP_DEFAULT_LENGTH): number {
  return Math.max(0, Math.min(length - 1, index + delta))
}

function finalize(arr: string[], focus: number, length: number): OtpTransition {
  const value = arr.map((digit) => digit || ' ').join('').trimEnd()
  return {
    value,
    focus: Math.max(0, Math.min(length - 1, focus)),
    complete: value.length === length && /^\d+$/.test(value),
  }
}
