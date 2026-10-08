# RePXL UI/UX design system

Updated 2026-10-08 after the storefront UI refinement pass.

## Direction

RePXL remains a premium vintage-camera marketplace: photography and the red
signal accent do the expressive work, while the interface stays quiet and
precise. The refinement is intentionally evolutionary rather than a new visual
identity.

## Shared tokens

The canonical theme tokens live in `src/app/globals.css` and continue to
support both dark and light themes:

- dark background `#050303`, warm text `#F5F1EC`, muted text `#8C8580`, red
  `#C22C2C`
- light background `#faf7f2`, ink `#1a1610`, muted text `#6b6357`, red
  `#b52a2a`
- `--surface-raised` for elevated panels and `--surface-inset` for controls
  and recessed content
- `--focus-ring` for consistent keyboard focus and `--shadow-panel` for
  restrained panel depth

Typography remains General Sans for display, Inter for body copy, and JetBrains
Mono for functional metadata. No new font or brand color was introduced.

## Shared behavior

- `Button` now uses a consistent medium radius, stronger primary-action depth,
  and the existing RePXL red hierarchy.
- `Container` uses a slightly more fluid small-screen gutter.
- `Navbar` has a stable translucent frame and reveals its boundary on hover or
  keyboard interaction, improving orientation over photographic hero content.
- Product cards retain their existing family typography, geometric camera
  stage, wishlist/cart behavior, ratings, stock states, and theme mapping while
  using a tighter shared silhouette.
- Shared `.repixl-surface`, `.repixl-inset`, and `.repixl-control` classes are
  available for future component consolidation.
- Reduced-motion behavior remains governed by the existing global media query.

## Verification and limits

- `npx tsc --noEmit` passed.
- `npm run build` passed; Next.js generated all 68 static pages.
- No database, payment, authentication, or checkout business logic changed.

## Browser QA (2026-10-08)

Real browser smoke QA ran against the local Next.js server in headless Chrome.
Desktop viewport: 1440 × 1000. Mobile viewport: 390 × 844.

Checked routes:

- `/`, `/products`, `/search?q=canon`, `/cart`, `/checkout`, `/login`
- `/account`, `/account/security`, `/account/notifications`, `/wishlist`,
  `/compare`, `/admin/login`
- `/products/canon-powershot-a520` was also requested for product-detail QA;
  the local database/API returned the intentional `Camera not found` state, so
  the populated product-detail purchase flow was not verifiable locally.

Results: no horizontal overflow, cut-off content, broken images, hydration
errors, or runtime exceptions were observed on the available routes. Header
search, mobile navigation, and the catalog filter affordance were clicked and
responded. The console contained existing Next.js image guidance only:
unconfigured `quality="90"` values and an LCP `priority` suggestion; these are
not caused by the UI refinement and remain follow-up maintenance.

This was a visual and interaction smoke pass, not a full screen-reader or
keyboard-tab audit. Authenticated account, populated cart/checkout, and admin
dashboard states require valid local sessions and database availability.
