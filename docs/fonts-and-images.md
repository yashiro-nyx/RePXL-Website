# RePXL — Font Loading & Next.js Image Optimization

Covers RePXL's website font-loading architecture (and the fix applied), plus the
conversion of customer-facing product images to `next/image`.

---

## FONT AUDIT

### Original RePXL font families
- **Display / headings** — **General Sans** (Tailwind `font-display` →
  `var(--font-general-sans)`), weights 200–700 used across the app (headings
  also use `font-black` (900), which General Sans doesn't ship — the browser
  synthesizes it; this is pre-existing and unchanged).
- **Body / UI** — **Inter** (`font-body` → `var(--font-inter)`).
- **Mono / technical labels** — **JetBrains Mono** (`font-mono` →
  `var(--font-jetbrains-mono)`).

### Original loading method
- Inter and JetBrains Mono: `next/font/google` in `src/app/layout.tsx`
  (self-hosted by Next.js at build time; served from our own origin — **no**
  runtime `fonts.googleapis.com` / `fonts.gstatic.com` request). Their CSS
  variables are attached to `<html>` and consumed by Tailwind's `fontFamily`.
- General Sans: a runtime `<link rel="stylesheet">` to the **Fontshare** CDN
  (`https://api.fontshare.com/v2/css?f[]=general-sans@...&display=swap`), plus an
  inline `:root { --font-general-sans: 'General Sans', sans-serif }`.

### Exact problem discovered
There is **no `fonts.googleapis.com` `@import` or `<link>`** anywhere, and **no
duplicate loading** — Inter/JetBrains are loaded once (via `next/font`) and
General Sans once (via Fontshare). The real issue is that **the display font is
fetched at runtime from a third-party CDN (Fontshare)**:
- render/latency dependent on an external origin (no `preconnect`),
- if Fontshare is slow or unreachable, headings fall back with possible
  flash/shift,
- inconsistent with the self-hosted body/mono fonts.

The production build reports **no font error/warning** (`next/font` fetches
Inter/JetBrains fine at build time in this environment), so this is a
runtime/architecture concern, not a build failure.

### Root cause
General Sans was wired as an unoptimized third-party runtime stylesheet with no
connection warming and a bare `sans-serif` fallback.

### Font-loading changes
In `src/app/layout.tsx`:
- Added `<link rel="preconnect">` to `https://api.fontshare.com` and
  `https://cdn.fontshare.com` (Fontshare serves font binaries from the `cdn`
  origin) so the connection is warmed before the stylesheet/fonts are requested.
- Kept `display=swap` (text renders immediately in the fallback — never blank).
- Gave `--font-general-sans` a **size-similar system fallback stack**
  (`ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica,
  Arial, sans-serif`) so headings stay readable with minimal layout shift while
  General Sans loads, or if Fontshare is unreachable.
- Replaced the misleading `next/font/local` comment with an accurate description.
- Inter/JetBrains via `next/font/google` were left unchanged (already optimal).

**Design preserved:** no font family, heading style, body typography, weights,
letter-spacing, or hierarchy changed. Only the loading/config was corrected.

### Duplicate loaders removed
None — there were no duplicate loaders. (No `@import`, no Google Fonts `<link>`,
no second `next/font` for the same family.)

### Weights / subsets configured
- Inter, JetBrains Mono: `subsets: ['latin']`, `display: 'swap'` (self-hosted).
- General Sans: Fontshare request weights `200,300,400,500,600,700` (unchanged;
  matches what the design uses; 900 is synthesized as before). General Sans does
  not publish 800/900, so no weight was added that the font can't serve.

### Fallback stack
`--font-general-sans: 'General Sans', ui-sans-serif, system-ui, -apple-system,
'Segoe UI', Roboto, Helvetica, Arial, sans-serif`. Body/mono get `next/font`'s
automatic size-adjusted fallbacks plus the Tailwind `sans-serif`/`monospace`
tail.

### Why General Sans was NOT migrated to next/font (reported limitation)
- **`next/font/google`** can't host it — General Sans is **not on Google Fonts**
  (it's an Indian Type Foundry font on Fontshare).
- **`next/font/local`** would require the actual font files in `public/fonts/`,
  which are **empty** in this repo (only `.gitkeep`); the task forbids
  downloading fonts from unofficial sources or committing unlicensed binaries.
- Therefore the font is **preserved as-is via Fontshare**, now with `preconnect`
  + a resilient fallback. To fully self-host later, add the licensed General Sans
  `.woff2` files to `public/fonts/` and switch to `next/font/local` (no design
  change) — a separate, approved step.

### Browser / network verification
**Not performed** — no browser tooling was used. Verified via type-check and a
clean production build only. Recommended manual check: load Home / Cameras /
Product Details / Compare / Account / Checkout, confirm headings render in
General Sans, and confirm no font console/network errors.

### Build verification
`npm run build` — exit 0, **0 warnings**, "Compiled successfully", lint + types
pass. No `next/font` fetch error and no Fontshare-related build error.

### Remaining font warnings
None observed in the build. (Runtime: if the Fontshare CDN is ever blocked, the
fallback stack renders headings in a system sans-serif — by design.)

### Emails are separate (unchanged)
Email templates use their own email-safe stacks (`EMAIL_FONT_SANS` /
`EMAIL_FONT_SERIF` / `EMAIL_FONT_MONO` in `src/lib/email/`). The website font
change was **not** applied to emails — the redesigned RePXL emails are untouched.

---

## Next.js Image warnings (category A)

### What was wrong
Several customer-facing **product images** were raw `<img>` tags with inline
`{/* eslint-disable-next-line @next/next/no-img-element */}` suppressions — the
warning was silenced rather than fixed.

### Fix (suppressions removed, converted to `next/image`)
- **Product detail (PDP) main image** — now `next/image` with `fill` +
  `sizes="(min-width:1024px) 45vw, 92vw"` + `priority` (it's the LCP image),
  wrapped in a `relative h-full w-full` div inside the existing `aspect-square`
  `CornerBracket`. Preserves `object-contain` + hover scale.
- **Thumbnails** (fixed-size, no layout change) — `next/image` with explicit
  `width`/`height` + `sizes` matching their containers:
  - Cart line item (`80`), Compare header card (`112`) + compare spec row (`40`),
    Checkout review summary (`48`), `CheckoutOrderSummary` (`48`).
- **About page editorial & hero assets** (migrated 2026-10-02) — converted from
  outdated placeholder SVGs (`editorial-1.svg` and `hero-sample-photo.svg`) and raw
  `<img>` tags with eslint suppressions to authentic photographic digicam assets:
  - Archival rear card: `/images/digicamera1.png` (Canon PowerShot 2003) with `next/image`,
    `width={1374}`, `height={1145}`, `quality={90}`, and drop shadows with red ambient glow.
  - Archival front print: `/images/canonsample.png` (authentic 2004 CCD direct-flash photo)
    in a polaroid mount with `next/image` (`fill`, `sizes`, `quality={90}`).
  - Atmospheric environment: `/images/lightmodebg.png` and `/images/darkmodebg.png`
    with `next/image` (`fill`, `priority`) in `AboutHero`.
  - All eslint suppressions removed from `src/app/(storefront)/about/page.tsx`.

### Intentionally left as raw `<img>` (out of the product-image scope)
- Review-photo thumbnails (`ReviewsPanel`, `ReviewImageThumbnails`) and the
  `GlobalToast` image — user-uploaded/transient content; keeping their
  suppressions avoids remote-loader churn for this task.
- Admin dashboard `<img>` (admin-only).

### Config
`next.config.mjs` already enables `dangerouslyAllowSVG` (product art includes
local SVGs) and `remotePatterns` for Cloudinary / S3 / CloudFront, so both local
and remote product images optimize without further config. **Next.js image
optimization was not disabled globally.**

### Verification
`npx tsc --noEmit` clean; `npm run build` exit 0 with **0 warnings**;
`/products`, `/products/[slug]`, `/about`, `/cart`, `/compare`, `/checkout` all build. No
browser verification performed.
