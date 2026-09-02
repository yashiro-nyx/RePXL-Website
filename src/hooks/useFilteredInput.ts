/**
 * useFilteredInput
 *
 * Returns a `onKeyDown` handler that blocks keystrokes not matching `pattern`.
 * Attach it to any <input> to enforce character-level filtering as the user types.
 *
 * Passes through:
 *  - All control / meta keys (Backspace, Delete, Tab, Enter, Arrow keys, etc.)
 *  - Clipboard shortcuts (Ctrl/Cmd + A/C/V/X/Z)
 *
 * Blocks:
 *  - Any printable character whose string representation does NOT match `pattern`
 *
 * @param pattern - RegExp that ACCEPTS one character at a time (e.g. /[0-9]/)
 */
export function useFilteredInput(pattern: RegExp) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Always allow: control / meta keys, function keys, clipboard combos
    if (
      e.ctrlKey || e.metaKey ||
      e.key.length > 1 // non-printable (Backspace, Delete, Tab, Enter, ArrowLeft…)
    ) return

    // Block any single printable character that doesn't match the pattern
    if (!pattern.test(e.key)) {
      e.preventDefault()
    }
  }
  return { onKeyDown }
}

/** Pre-built filter presets */

/** Only digits 0–9 */
export const digitsOnly = /^[0-9]$/

/** Only letters (any unicode letter), spaces, hyphens, apostrophes */
export const nameChars = /^[a-zA-ZÀ-ÿ\u00f1\u00d1 '\-.]$/

/** Letters + digits (no symbols) — for promo codes, serial numbers */
export const alphanumeric = /^[a-zA-Z0-9]$/

/** Letters + digits + hyphens — for formatted codes like "ABCD-1234" */
export const alphanumericHyphen = /^[a-zA-Z0-9\-]$/
