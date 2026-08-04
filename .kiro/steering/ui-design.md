---
inclusion: always
name: ui-design
description: UI/UX design system, layout specs, and animation guidelines for the RePXL vintage digicam e-commerce website. Use for any work involving pages, components, styling, or interactions.
---

# RePXL — UI/UX Steering Document

## 0. How to use this file
This is a Kiro steering file for **RePXL: Development of a Vintage Digital Camera
(Digicam) E-commerce Website**, a Systems Integration & Architecture 01 project.
It defines the visual language, layout, and interaction rules Kiro should follow for
**every UI task** on this project — landing page, product pages, cart, checkout,
account, and admin screens. When a request doesn't specify a design detail, Kiro
should default to what's written here rather than inventing a new style.

This file should sit alongside (not replace) three foundation steering files Kiro
normally generates for a project: `product.md`, `tech.md`, and `structure.md`. If
those don't exist yet in `.kiro/steering/`, generate them first — this doc assumes
they exist and focuses only on UI/UX.

---

## 1. Product Context (for design decisions)
- **What it is:** A marketplace for buying/selling **vintage digital cameras** and
  accessories — not film cameras, not modern cameras, not rentals or peer-to-peer
  trades. Every design choice should reinforce "credible, curated, retro-tech
  marketplace," not a generic Shopify-style store.
- **Users:** Photography/film enthusiasts and collectors (customers) and a store
  admin (inventory, orders, listings). Design for two distinct experiences:
  a rich, emotive storefront for customers, and a clean, functional dashboard for
  the admin — do not reuse storefront visual flourishes inside admin screens.
- **Trust is the core problem being solved.** The problem statement calls out lack
  of seller verification, condition transparency, and organized listings as market
  gaps. UI should make **condition grading, serial number/authenticity info, and
  reviews** feel prominent and credible — not buried.

---

## 2. Design Direction & Mood
Aesthetic: **"analog nostalgia meets modern e-commerce."** Think camera viewfinder
UI, film grain, brushed metal and matte black hardware, warm dusk gradients — laid
over a clean, fast, modern e-commerce shell. Reference points to follow:

1. **Hero/landing treatment** — reference image provided (OPTIQ-style):
   - Oversized, semi-transparent display type sitting *behind* the hero product
     shot (a word like "VINTAGE" or "RePXL" bled large across the hero, low
     opacity, cropped by the viewport).
   - A camera product shot placed at a slight diagonal tilt, front and center,
     large enough to dominate the fold.
   - **Corner-bracket accents** (viewfinder-style `⌐ ¬` brackets) around the logo
     wordmark and around key text blocks — this is the single most distinctive
     motif from the reference and should be reused as a small recurring UI detail
     (around badges, around the logo, around featured-image frames).
   - Soft gradient background (dusty pink/mauve fading to near-black at the
     bottom of the hero) rather than a flat color.
   - A small polaroid-style tilted photo card floating near the hero (sample shot
     "from" the camera being featured) to reinforce "this camera takes photos
     like this."
   - Top nav: logo centered or left, simple text links, icon cluster on the right
     (search, wishlist/heart, cart, menu) — keep this cluster minimal and iconic.
   - Bottom-left stacked circular avatars + "+" bubble + a bracketed CTA label
     (e.g. `[ Our Gallery ]`) is a nice pattern to adapt for **"Recently viewed
     by collectors"** or **"Join N verified sellers"** style social proof.

2. **Scroll storytelling** — reference site (lionheartphotography.vercel.app):
   - Landing page is built as a **sequence of full-viewport scroll sections**,
     each with its own mood, not a single static hero + grid.
   - Uses **parallax layers** (background image moves slower than foreground
     text/product), large editorial typography that breaks across lines, and
     images that stack/overlap rather than sitting in a rigid grid.
   - A dedicated "shop by brand/category" section presented like a gallery/story
     ("Cameras" section pairing each camera with a moody sample shot), not a
     plain product grid — adapt this for a **"Shop by Era / Shop by Brand"**
     section using real vintage brands (e.g. Canon, Nikon, Sony CyberShot,
     Kodak PixPro, Panasonic Lumix, Fujifilm).
   - Section transitions feel cinematic: fade/slide-in on scroll, images that
     scale slightly as they enter view, sticky/pinned panels while text scrolls
     past them.

**Kiro should treat these two references as the target for the landing page
specifically** — animated, scroll-driven, editorial. Interior pages (listing,
PDP, cart, checkout, account, admin) should be calmer and far more
utilitarian: fast, clear, minimal motion, because those pages are about
completing a task, not setting a mood.

---

## 3. Color Palette
Use a small, deliberate palette — do not default to generic Tailwind blues.

| Role | Direction | Example |
|---|---|---|
| Primary background (storefront) | Near-black / deep charcoal | `#121012` |
| Secondary background | Warm off-white / bone | `#F4EFE9` |
| Accent (brand/CTA) | Signal red (camera "REC" red) | `#C22C2C` |
| Gradient accent | Dusty rose → charcoal | `#EBD3CE → #16131a` |
| Text on dark | Warm white | `#F5F1EC` |
| Text on light | Near-black | `#1A1816` |
| Muted/secondary text | Warm gray | `#8C8580` |
| Success / stock available | Muted olive-green | `#5A6E4E` |
| Warning / low stock | Amber | `#C98A2B` |

The red accent should be used **sparingly and intentionally** — record/status
indicators, primary CTA buttons, sale badges, condition-grade highlights — mirroring
how it's used as a single "hot" accent color against black hardware in the
reference image, not scattered across every element.

## 4. Typography
- **Headline/display font:** a geometric or slightly condensed sans-serif with
  personality (e.g. a font in the style of "General Sans", "Söhne", or
  "Neue Montreal") for hero statements and section headers — should read well at
  very large sizes with tight tracking.
- **Body/UI font:** a clean, highly legible sans-serif (e.g. Inter, Public Sans)
  for product data, forms, tables, and admin screens — legibility over character.
- **Optional accent font:** a monospace font for camera specs, serial numbers,
  SKUs, and timestamps (echoes the on-screen camera readouts like `00:05 •REC`
  in the reference image) — use for small technical labels only, never body text.
- Maintain a clear type scale (e.g. 12/14/16/20/28/40/64px) and reuse it
  everywhere; don't introduce arbitrary sizes per page.

## 5. Layout & Grid
- 12-column responsive grid, `max-width` container around 1280–1440px on desktop,
  generous outer margins (this project should not feel edge-to-edge cramped).
- Base spacing unit of 4px/8px; keep consistent vertical rhythm between sections
  (e.g. 96–140px of breathing room between major landing-page sections).
- Product grids: 4 columns desktop → 2 columns tablet → 1–2 columns mobile.
- Use the corner-bracket motif and thin 1px hairline borders as the primary
  "framing" device instead of heavy drop shadows or card backgrounds — it should
  feel like looking through a viewfinder, not like generic Material cards.

---

## 6. Landing Page — Section-by-Section Spec
Build the landing page as a sequence of full-bleed sections, in this order,
matching the storytelling structure of the reference site:

1. **Nav** — fixed/sticky, transparent over the hero, solidifies (background
   fades in) on scroll past the hero.
2. **Hero** — per Section 2.1 above: oversized background type, tilted hero
   camera product shot, gradient, corner-bracket logo, polaroid sample-photo
   accent, primary CTA ("Shop the Collection") + secondary CTA ("Sell With Us"
   or "Browse Gallery").
3. **Trust strip** — small horizontal row of credibility markers: verified
   sellers, condition-graded listings, secure checkout, buyer protection —
   directly answering the problem statement (credibility gap in existing
   marketplaces). Simple icon + short label, no heavy animation.
4. **Editorial/story section** — large scroll-triggered typography (parallax),
   1–2 evocative lines about vintage photography, paired with layered/stacked
   imagery, similar to the "When Film Spoke in Whispers" section on the
   reference site — adapted to digicams, e.g. "Before filters, there was
   film-tone at ISO 100."
5. **Shop by Brand/Category** — gallery-style section pairing each major brand
   with a mood photo (per Section 2.2), links into filtered product listing.
6. **Featured/New Arrivals carousel** — real product cards (image, name, price,
   condition badge, quick-add to cart/wishlist).
7. **Condition & trust explainer** — short visual breakdown of how condition
   grading works (e.g. Mint / Excellent / Good / Fair) since this is a core
   differentiator from social-media resale.
8. **Customer reviews/testimonials** — simple, credible, not over-designed.
9. **Newsletter / community CTA** — optional, lightweight.
10. **Footer** — standard e-commerce footer (about, support, policies, socials,
    payment method icons).

---

## 7. Animation & Interaction Guidelines
- **Landing page only:** scroll-triggered reveal animations (fade + slight
  translate-Y on enter), parallax background movement, and a hero
  entrance animation on first load (staggered fade/slide of hero elements).
  Favor CSS/JS scroll-linked animation (e.g. Intersection Observer or a
  scroll-animation library) over anything that blocks interactivity.
- **Micro-interactions everywhere:** button hover/press states, image zoom on
  product card hover, smooth cart-drawer slide-in, skeleton loaders instead of
  spinners for product grids/images.
- **Motion budget:** keep animations under ~400ms for UI feedback (buttons,
  toggles) and under ~800ms for section reveals. Respect
  `prefers-reduced-motion` — disable parallax/scroll animation for users who
  have that OS setting on.
- **Do not animate for animation's sake on transactional flows.** Cart, checkout,
  and forms should feel instant and stable — no parallax, no scroll-jacking,
  minimal transitions, so nothing gets in the way of completing a purchase.
- Loading and empty states (empty cart, empty wishlist, no search results, out of
  stock) should be explicitly designed, not left as bare defaults.

---

## 8. Core Page Specs (beyond landing)
Interior pages should be calm, fast, and information-dense where it matters —
motion is secondary to clarity here.

- **Product Listing / Search Results:** filter sidebar (brand, price range,
  condition grade, sensor type/megapixels, release era), sort control, grid of
  product cards, pagination or infinite scroll, filter chips showing active
  filters, empty-state for zero results.
- **Product Detail Page (PDP):** image gallery (multiple angles + zoom),
  condition grade badge prominent near price, full spec sheet (use the
  monospace accent font here), serial number/authenticity note, seller/admin
  info, stock status, add to cart + add to wishlist, related/compare products,
  reviews and ratings section, Q&A/contact-admin entry point.
- **Compare view:** side-by-side spec comparison table for 2–3 cameras
  (explicitly called out in the study — build this as a real page, not just a
  concept).
- **Cart:** line items with thumbnail, condition badge, quantity (usually 1 for
  unique vintage units — consider disabling quantity increment for one-of-a-kind
  stock and show "1 available"), price breakdown, promo code field, persistent
  order summary, clear path to checkout.
- **Checkout:** multi-step or single-page (confirm with team), shipping info,
  payment method selection (local digital payment + credit card, per scope),
  order review, confirmation screen with order number.
- **Account:** profile/account management, order history with status/tracking,
  saved addresses/payment methods, wishlist, reviews written.
- **Admin Dashboard:** sales overview widgets, stock/inventory table with
  condition + serial number fields, low-stock alerts, order management, logs,
  listing management (create/edit/archive). Use the light/utilitarian style,
  data-table conventions, and the monospace accent font for IDs/serials —
  minimal to no decorative motion.

---

## 9. Component Conventions
- Build a shared component library (buttons, badges, inputs, cards, modals,
  toasts, nav, footer) once and reuse — do not hand-roll one-off styles per page.
- **Condition badges** are a first-class component (color-coded: Mint, Excellent,
  Good, Fair) used consistently across listing, PDP, cart, and admin.
- **Corner-bracket frame** should be its own reusable component/utility class,
  used for the logo, featured images, and callout badges — not hardcoded per
  instance.
- Buttons: one primary style (solid, red accent), one secondary (outline/ghost),
  consistent sizing scale across the app.

---

## 10. Responsive & Accessibility
- Mobile-first build; verify every landing-page animation degrades gracefully on
  mobile (reduce parallax intensity, keep hero readable at small sizes).
- Maintain WCAG AA contrast, especially for white/warm-white text over the
  gradient hero background — test contrast at the point CTAs and nav links sit.
- All interactive elements keyboard-navigable and screen-reader labeled,
  including custom components like the image gallery, filter chips, and cart
  drawer.
- Respect `prefers-reduced-motion` globally, not just on the landing page.

---

## 11. Do's and Don'ts for Kiro
**Do:**
- Reuse the corner-bracket, gradient, and monospace-spec-label motifs across the
  whole site so it reads as one coherent brand, not just a flashy landing page
  bolted onto a generic store.
- Keep transactional flows (cart/checkout/account) fast and low-motion even
  while the landing page is highly animated.
- Surface condition grade, serial number, and seller credibility info early and
  often — it's the product's core differentiator.

**Don't:**
- Don't default to a generic Tailwind/Bootstrap look-and-feel for the storefront.
- Don't carry landing-page-level animation intensity into checkout or admin.
- Don't invent new colors/fonts/spacing outside Sections 3–5 without updating
  this steering file first, so the system stays consistent.

---

## 12. Recommended Next Steering Files
For best results, also create (or generate via Kiro's steering command):
- `.kiro/steering/product.md` — RePXL's purpose, users, and objectives (can be
  drawn directly from the project's Background of the Study/Objectives).
- `.kiro/steering/tech.md` — confirmed stack (frontend framework, styling
  approach, backend, database, payment integration) once decided.
- `.kiro/steering/structure.md` — folder/file organization and naming
  conventions once the codebase scaffold exists.
