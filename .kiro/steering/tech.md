---
inclusion: always
name: tech
description: Technology stack, tooling, and technical conventions for the RePIXL project. Use for any implementation decisions.
---

# RePIXL — Tech Steering Document

## 1. Stack Overview

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend framework | **Next.js 14+ (App Router)** | SSR/SSG for SEO, file-based routing, React ecosystem |
| Styling | **Tailwind CSS** (customized palette) | Utility-first, fast iteration, easy to enforce design tokens |
| Animation | **Framer Motion** + CSS scroll-linked | Parallax, scroll reveals, micro-interactions per UI steering |
| UI components | Custom component library | Built to match RePIXL's design system, not a generic kit |
| State management | **React Context + Zustand** | Cart, wishlist, auth state — lightweight, no Redux overhead |
| Backend / API | **Next.js API Routes** or separate Express/Node server | TBD — confirm with team |
| Database | **PostgreSQL** (via Prisma ORM) | Relational data (products, orders, users, reviews) |
| Auth | **NextAuth.js** or equivalent | Session-based auth for customers + admin role |
| Payment | **Local digital payment + Stripe** | Per scope: local payment method + credit card |
| Image hosting | **Cloudinary** or S3 + CDN | Optimized product images, multiple angles |
| Deployment | **Vercel** | Natural fit for Next.js, preview deploys |

> **Note:** This stack is a recommendation based on project requirements. If the team
> has already committed to different choices, update this file to reflect reality.

## 2. Key Technical Decisions

### Rendering strategy
- Landing page: **SSG** (static generation) for performance — animations are
  client-side hydrated.
- Product listing/PDP: **SSR** or **ISR** (incremental static regeneration) so
  stock/condition data stays fresh.
- Cart/checkout: **Client-side** with server validation on submit.
- Admin dashboard: **Client-side SPA** behind auth guard.

### Design token implementation
All colors, fonts, spacing, and breakpoints from `ui-design.md` should be encoded
as Tailwind theme extensions in `tailwind.config.ts`:

```js
// tailwind.config.ts (partial)
theme: {
  extend: {
    colors: {
      'repixl-bg': '#121012',
      'repixl-bone': '#F4EFE9',
      'repixl-red': '#C22C2C',
      'repixl-rose': '#EBD3CE',
      'repixl-charcoal': '#16131a',
      'repixl-text-light': '#F5F1EC',
      'repixl-text-dark': '#1A1816',
      'repixl-muted': '#8C8580',
      'repixl-success': '#5A6E4E',
      'repixl-warning': '#C98A2B',
    },
    fontFamily: {
      display: ['General Sans', 'sans-serif'],
      body: ['Inter', 'sans-serif'],
      mono: ['JetBrains Mono', 'monospace'],
    },
    maxWidth: {
      container: '1440px',
    },
  },
}
```

### Image handling
- Product images: multiple angles required, stored with consistent naming
  (`{product-slug}-{angle}-{size}.webp`).
- Use Next.js `<Image>` component with priority loading for above-fold images.
- Lazy-load below-fold gallery images.
- Provide blur placeholder data URLs for skeleton loading.

### API structure
RESTful endpoints (or tRPC if team prefers):
- `/api/products` — CRUD, filtering, search, pagination
- `/api/products/[id]/reviews` — reviews per product
- `/api/cart` — cart operations
- `/api/orders` — checkout, order history
- `/api/auth` — login, register, session
- `/api/admin/*` — admin-only endpoints behind role check

## 3. Code Quality & Conventions

- **TypeScript** — strict mode, no `any` types in production code.
- **ESLint + Prettier** — consistent formatting, enforced via pre-commit hook.
- **Component naming:** PascalCase, one component per file, co-located styles/tests.
- **File naming:** kebab-case for files and folders.
- **Imports:** absolute paths via `@/` alias (e.g. `@/components/ui/Button`).
- **Git:** conventional commits (`feat:`, `fix:`, `chore:`, etc.), feature branches.

## 4. Performance Targets
- Lighthouse score ≥ 90 on landing page (after animation budget).
- First Contentful Paint < 1.5s.
- Cumulative Layout Shift < 0.1.
- Product images served as WebP, appropriately sized per viewport.
- Bundle size monitored — no single page JS bundle > 200KB gzipped.

## 5. Security Considerations
- Input validation on all API routes (zod schemas).
- CSRF protection on state-changing operations.
- Rate limiting on auth and checkout endpoints.
- Parameterized queries via Prisma (no raw SQL injection risk).
- Environment variables for all secrets — never committed to repo.
- Admin routes protected by role-based middleware.

## 6. Testing Strategy
- **Unit tests:** Vitest for utility functions and hooks.
- **Component tests:** Testing Library for UI components.
- **E2E tests:** Playwright for critical flows (browse → cart → checkout).
- **Visual regression:** optional, via Chromatic or Percy if budget allows.

## 7. Dependencies to Confirm
Before scaffolding, confirm with the team:
- [ ] Backend architecture: Next.js API routes vs. separate server?
- [ ] Database hosting: local dev + managed PostgreSQL for prod?
- [ ] Payment provider: specific local payment method to integrate?
- [ ] Image storage: Cloudinary vs. S3 vs. other?
- [ ] Deployment target: Vercel confirmed?
