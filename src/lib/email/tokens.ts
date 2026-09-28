/**
 * RePXL email design tokens.
 *
 * A single, restrained palette + type scale shared by every outgoing customer
 * email so the whole program reads as one brand. The direction is a premium,
 * minimalist e-commerce aesthetic: a neutral/white canvas, near-black text, and
 * a restrained RePXL red used only for accents and the primary CTA.
 *
 * Values are plain strings meant to be inlined into `style="…"` attributes —
 * email clients (Gmail especially) do not reliably support <style> blocks,
 * classes, or custom properties, so everything is inline.
 */

export const EMAIL_COLORS = {
  /** Outer canvas behind the card — soft neutral, not stark white. */
  canvas: '#f4efe9',
  /** Card / content surface. */
  surface: '#ffffff',
  /** Subtle inner surface for info cards and table zebra. */
  surfaceMuted: '#faf8f5',
  /** Hairline borders and dividers. */
  border: '#e7e1d8',
  /** Slightly stronger divider for section separation. */
  borderStrong: '#d9d2c7',
  /** Primary body text (near-black, warm). */
  text: '#1a1816',
  /** Secondary/supporting text. */
  textMuted: '#6b6560',
  /** Faint text for footer/legal. */
  textFaint: '#9c958d',
  /** RePXL signal red — accents + primary CTA only. */
  accent: '#c22c2c',
  /** Text placed on the red accent. */
  onAccent: '#ffffff',
  /** Positive/success (muted olive). */
  success: '#5a6e4e',
  /** Warning (amber). */
  warning: '#b06f1f',
} as const

/** Body/UI font stack (system sans — universally available in mail clients). */
export const EMAIL_FONT_SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** Display font stack for the wordmark/headings (serif, matches storefront tone). */
export const EMAIL_FONT_SERIF = "Georgia,'Times New Roman',Times,serif"

/** Monospace stack for order numbers, codes, and technical labels. */
export const EMAIL_FONT_MONO = "'Courier New',Courier,monospace"

/** Max content width — comfortable single column that fits Gmail on mobile. */
export const EMAIL_MAX_WIDTH = 600
