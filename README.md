# RePIXL

**Capture the past. Frame the future.**

RePIXL is the curated marketplace for vintage digital cameras — condition-graded, serial-verified, and trusted by collectors worldwide. It's built for the early-2000s digicam era: CyberShots, PowerShots, Coolpixes, and the CCD compacts that shaped a generation of casual photography.

The whole product leans into that era visually — a black-dominant, film-burn aesthetic (warm red/orange light leaking in from the edges, grain texture, fading to near-black at the center) that echoes the CRT-and-CompactFlash period the products themselves are from.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Admin Dashboard](#admin-dashboard)
- [Environment Variables](#environment-variables)
- [Roadmap](#roadmap)
- [License](#license)

---

## Features

### Storefront
- **Home** — hero, trust strip (Verified Sellers / Condition-Graded Listings / Secure Checkout / Buyer Protection), featured listings
- **Cameras** — full catalog of vintage digicams, browsable by condition grade, era, and spec
- **Compare** — side-by-side spec comparison across multiple cameras
- **About** — brand story and grading philosophy

### Accounts
- User sign-in / session auth
- Saved items / wishlist
- Order history

### Admin Dashboard (`/admin`)
- Camera inventory management, including an **archived cameras** view
- **Orders** management (active + archived)
- **Customers** management (active + archived)
- **Logs** — activity/audit trail
- **Settings** — store configuration
- Dedicated, calmer visual treatment (see [Design System](#design-system)) — the admin sign-in and dashboard intentionally use a near-zero "burn" so operators aren't fighting the marketing site's visual intensity while doing data-entry work

---

## Tech Stack

- **[Next.js](https://nextjs.org/)** (App Router)
- **TypeScript**
- **Tailwind CSS** (custom `text-repixl-red` brand token)
- **[General Sans](https://www.fontshare.com/)** via Fontshare CDN — primary UI typeface
- **Inter** — body/secondary typeface (`next/font`)
- **JetBrains Mono** — monospace accents (EXIF-style labels, eyebrow text, spec data)
- Session-based auth (`/api/auth/session`)

---

## Getting Started

```bash
# clone the repo
git clone https://github.com/yashiro-nyx/RePIXL-Website.git
cd RePIXL-Website

# install dependencies
npm install

# run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the storefront.
Open [http://localhost:3000/admin](http://localhost:3000/admin) for the admin dashboard.

> **Note:** for production, self-host the font files under `public/fonts/` and reference them locally rather than the Fontshare CDN link used in development.

---

## Project Structure

```
src/
  app/
    layout.tsx              # root layout — fonts (Inter, JetBrains Mono), global metadata
    page.tsx                # Home
    cameras/                # camera catalog + detail pages
    compare/                # comparison tool
    about/                  # brand story page
    admin/
      layout.tsx            # admin-specific layout (reduced burn intensity)
      page.tsx              # admin sign-in
      archived-cameras/
      archived-customers/
      archived-orders/
      accounts/
      logs/
      settings/
    api/
      auth/
        session/            # session endpoint
  globals.css                # global styles, --burn-opacity variable, burn-* utility classes
```

*(Structure inferred from the current build — update this section as the app grows.)*

---

## Design System

RePIXL's background is a single, continuous "film burn": a black-dominant canvas with a rough, grainy red/amber glow concentrated at the edges only, fading to near-black at the center so text and UI stay fully legible. It's applied at the root layout level (not per-section) to avoid visible seams between page sections.

Because the burn is a brand signature but not appropriate at full strength everywhere, its intensity is controlled per route via a CSS custom property:

| Context | Class | `--burn-opacity` | Notes |
|---|---|---|---|
| Marketing pages (Home, Cameras, Compare, About) | *(default)* | `1.0` | Full intensity — this is the primary brand expression |
| Account / checkout pages | `.burn-subtle` | reduced | Same palette, softened so it doesn't compete with forms and tables |
| Admin dashboard + sign-in | `.burn-minimal` | `0.15` (~85% reduction) | Just enough to signal "same brand," out of the way of data-entry UI |

Brand red: `text-repixl-red` — used consistently for primary actions and brand accents (e.g. the "Admin" wordmark, CTA buttons), replacing any ad-hoc blue.

---

## Environment Variables

```bash
# .env.local
# (add your actual variables here as the project grows, e.g.)
DATABASE_URL=
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
```

---

## Roadmap

- [ ] Payment integration for checkout
- [ ] Seller onboarding flow ("Sell With Us")
- [ ] Public API for camera specs/grading data
- [ ] Expanded condition-grading rubric documentation

---

## License

Private — all rights reserved.
