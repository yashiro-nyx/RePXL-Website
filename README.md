# RePXL

**Capture the past. Frame the future.**

RePXL is a curated marketplace for vintage digital cameras — condition-graded, serial-verified, and trusted by collectors. Built for the early-2000s digicam era: CyberShots, PowerShots, Coolpixes, and the CCD compacts that shaped a generation of casual photography.

The whole product leans into that era visually — a black-dominant, film-burn aesthetic (warm red/orange light leaking in from the edges, grain texture, fading to near-black at the center) echoing the CRT-and-CompactFlash period the products themselves are from. The site supports a full light/dark mode toggle that adapts the burn to a softer warm vignette in daylight.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Auth & Sessions](#auth--sessions)
- [Admin Dashboard](#admin-dashboard)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)

---

## Features

### Storefront
- **Home** — film-burn hero, trust strip, center-emphasis featured cameras carousel, editorial section, Shop by Brand gallery, condition explainer, testimonials, FAQ accordion, newsletter signup
- **Cameras** (`/products`) — full catalog with filter sidebar (brand, condition, price range), sort controls, skeleton loading states
- **Product Detail** — image gallery, condition badge, spec sheet (monospace), serial number, reviews & ratings, Add to Cart / Wishlist / Compare, live webcam filter demo (color profiles per brand/model)
- **Compare** — sticky spec-label column, side-by-side camera comparison with ratings row
- **Search** — full-text search by name, brand, series
- **About** — brand story, grading philosophy, stats

### Support Pages
- `/faq` — accordion Q&A (10 questions on grading, shipping, returns, payment, selling)
- `/shipping-returns` — full policy (packaging, timeframes, condition-mismatch returns, refunds)
- `/contact` — contact form stored to localStorage + fallback email
- `/condition-grading` — full Mint/Excellent/Good/Fair rubric with concrete definitions

### User Accounts
- Registration / login with form validation and password requirements
- Google / Apple OAuth (UI ready, requires credentials in `.env.local`)
- Per-user data isolation: cart, wishlist, compare, addresses, payment methods, orders are all keyed by email
- Session stored in `repixl-customer-session` (localStorage), separate from admin session
- `/account` — tabbed dashboard (Profile, Orders, Addresses, Payments, Reviews, Security)
- Account route is auth-gated: direct URL access redirects to `/login`
- Wishlist, Cart, Checkout, Wishlist pages

### Cart & Checkout
- Persistent cart per user (localStorage)
- Voucher/discount code validation
- Multi-step checkout with shipping, courier selection, payment method
- Order confirmation + order history in account

### Reviews & Ratings
- One review per user per product
- Verified-purchase badge for buyers
- Average rating displayed on PDP and compare page

### Live Filter Demo
- Webcam feed with real-time CSS filter presets per camera brand/model
- Color profiles: Canon (PowerShot CCD Warm), Kodak (Kodachrome-adjacent), Sony (CyberShot Cool), Nikon (Coolpix Punch), Fujifilm (FinePix Velvia), Panasonic (Lumix Natural)
- Dynamically imported (`ssr: false`) to avoid SSR breakage

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | **Next.js 14** (App Router) |
| Language | **TypeScript** (strict mode) |
| Styling | **Tailwind CSS** + custom design tokens |
| Animation | **Framer Motion** |
| State | **Zustand** (cartStore, wishlistStore, productStore, etc.) |
| Auth | Custom localStorage session (customer + admin sessions separated) |
| Social Auth | NextAuth.js (Google + Apple, UI-ready) |
| Fonts | **General Sans** (Fontshare CDN), **Inter** (next/font), **JetBrains Mono** (next/font) |

---

## Getting Started

```bash
# clone the repo
git clone https://github.com/your-repo/repxl-website.git
cd repxl-website

# install dependencies
npm install

# run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

**Admin credentials:**
```
Email:    admin@repixl-admin.com
Password: RePIXL2026!
```

> **Font note:** For production, download General Sans font files to `public/fonts/` and reference them locally rather than the Fontshare CDN link.

---

## Project Structure

```
src/
  app/
    layout.tsx                    # root layout — fonts, GlobalToast, AuthProvider
    page.tsx                      # Home (landing page)
    globals.css                   # design tokens, film-burn background, theme overrides
    (storefront)/                 # customer-facing route group
      products/page.tsx           # catalog with filters + skeleton loading
      products/[slug]/page.tsx    # PDP with filter demo
      compare/page.tsx            # comparison tool
      cart/page.tsx
      checkout/page.tsx
      account/page.tsx            # auth-gated account dashboard
      about/page.tsx
      faq/page.tsx
      shipping-returns/page.tsx
      contact/page.tsx
      condition-grading/page.tsx
      search/page.tsx
      wishlist/page.tsx
    (auth)/                       # login, register, forgot-password
    (admin)/admin/                # admin dashboard route group
      layout.tsx                  # admin layout (sidebar, auth guard, session expiry)
      page.tsx                    # dashboard with skeleton states
      cameras/page.tsx
      orders/page.tsx
      customers/page.tsx
      vouchers/page.tsx
      logs/page.tsx
      accounts/page.tsx           # super-admin only
      settings/page.tsx
      archived/                   # cameras / orders / customers
      login/page.tsx              # separate admin login
  components/
    landing/                      # Hero, TrustStrip, BrandGallery, FeaturedCarousel, etc.
    layout/                       # Navbar, Footer, Container, ConditionalNavbar
    product/                      # ProductCard, CameraFilterDemo
    ui/                           # Button, Skeleton, ConditionBadge, CornerBracket, Logo, ThemeToggle, etc.
    auth/                         # SocialAuthButtons, AuthProvider
  data/
    products.ts                   # seed product data
    faqs.ts                       # shared FAQ content (used on /faq and HomeFAQ)
    colorProfiles.ts              # per-brand camera color profiles for filter demo
    legal.ts                      # terms + privacy policy content
  stores/
    productStore.ts
    cartStore.ts
    wishlistStore.ts
    compareStore.ts
    authStore.ts                  # customer + admin sessions separated
    orderHistoryStore.ts          # with archive/restore, status updates
    reviewStore.ts
    themeStore.ts
    toastStore.ts
    voucherStore.ts
    archivedCustomerStore.ts
    addressStore.ts
    paymentStore.ts
  hooks/
    useScrollLock.ts
    useReducedMotion.ts
```

---

## Design System

### Film-burn background
A single continuous background applied at the `html` element — never per-section — so there are no visible seams between page sections. Controlled via `--burn-opacity` CSS variable:

| Context | Class | Burn intensity |
|---------|-------|---------------|
| Marketing pages (Home, Cameras, Compare, About) | *(default)* | Full |
| Account / checkout / auth pages | `.burn-subtle` | ~40% |
| Admin login | `.burn-minimal` | ~15% |

### Light / dark mode
Toggle in the Navbar. Preference persisted to `localStorage` (`repixl-theme`). Falls back to OS preference, then defaults to dark. Light mode adapts the burn to a warm radial vignette rather than red edge-streaks. Admin stays dark-only.

### Color tokens (Tailwind)
| Token | Dark | Light |
|-------|------|-------|
| `repixl-bg` | `#121012` | `#f5f0ea` |
| `repixl-charcoal` | `#16131a` | `#ffffff` |
| `repixl-text-light` | `#F5F1EC` | `#1a1610` |
| `repixl-muted` | `#8C8580` | `#6b6357` |
| `repixl-red` | `#C22C2C` | `#b52a2a` |

### Typography
- **`font-display`** → General Sans (headings, hero, product names)
- **`font-body`** → Inter (body text, forms, UI)
- **`font-mono`** → JetBrains Mono (prices, specs, badges, labels)

### Logo
SVG component (`src/components/ui/Logo.tsx`) using `currentColor` — adapts to both themes. Includes viewfinder corner brackets and animated REC dot.

---

## Auth & Sessions

Customer and admin sessions are **fully separated**:
- Customer session → `repixl-customer-session` (localStorage)
- Admin session → `repixl-admin-session` (localStorage, **expires after 60 minutes**)
- `hydrate()` reads customer session only (used by Navbar, storefront)
- `hydrateAdmin()` reads admin session only (used by admin layout)
- Admin emails (`@repixl-admin.com`) cannot register customer accounts
- Customer credentials cannot log into the admin dashboard

---

## Admin Dashboard

Admin credentials (demo/dev only — hardcoded, not from a database):
```
Email:    admin@repixl-admin.com
Password: RePIXL2026!
```

Features:
- **Dashboard** — stat cards with skeleton loading, inventory alerts, top-selling cameras
- **Cameras** — CRUD with image upload (base64, 500KB cap), brand/serial search
- **Orders** — status dropdown (updates to localStorage), archive/restore
- **Customers** — censored names/emails, orders modal, archive/restore
- **Vouchers** — create/delete with confirmation
- **Activity Logs** — filterable audit trail with details modal
- **Settings** — admin password change
- **Admin Management** — super-admin only, add/edit/delete admin accounts
- **Archived Data** — cameras, orders, customers (all restorable)
- Session auto-expires after 60 minutes, redirecting to admin login

---

## Environment Variables

```bash
# .env.local
GOOGLE_CLIENT_ID=        # Google OAuth (optional)
GOOGLE_CLIENT_SECRET=    # Google OAuth (optional)
NEXTAUTH_SECRET=         # Required for NextAuth if using social login
NEXTAUTH_URL=http://localhost:3000
```

---

## Roadmap

- [ ] Real backend (PostgreSQL + Prisma ORM) to replace localStorage persistence
- [ ] Email service integration for newsletter (Resend / Mailchimp)
- [ ] Payment gateway (Stripe + local GCash/PayPal)
- [ ] International shipping support
- [ ] Admin-facing analytics charts (revenue over time, top brands)
- [ ] Social account links in footer (once accounts are created)
- [ ] Self-hosted fonts (`public/fonts/`) for production font reliability
