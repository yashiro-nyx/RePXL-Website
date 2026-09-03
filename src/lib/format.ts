/**
 * src/lib/format.ts
 *
 * Centralised formatting utilities for RePXL.
 * All customer-facing monetary values should use formatPrice().
 *
 * Currency: Philippine Peso (₱ / PHP)
 * Stored DB values are already in PHP — no conversion is applied.
 */

/**
 * Format a numeric price as Philippine Peso.
 * Examples:
 *   formatPrice(71)      → "₱71.00"
 *   formatPrice(151.5)   → "₱151.50"
 *   formatPrice(1500)    → "₱1,500.00"
 *   formatPrice(0)       → "₱0.00"
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Compact version — no decimal places, no grouping separators.
 * Use only where space is extremely tight.
 *   formatPriceCompact(71) → "₱71"
 */
export function formatPriceCompact(amount: number): string {
  return `₱${Math.round(amount).toLocaleString('en-PH')}`
}
