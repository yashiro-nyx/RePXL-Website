---
inclusion: always
name: structure
description: Folder structure, file organization, and naming conventions for the RePIXL codebase. Use when creating new files or restructuring.
---

# RePIXL — Structure Steering Document

## 1. Project Root Layout

```
repixl/
├── .kiro/
│   └── steering/          # Kiro steering files
├── public/
│   ├── images/            # Static images (logos, icons, placeholders)
│   └── fonts/             # Self-hosted fonts (General Sans, etc.)
├── src/
│   ├── app/               # Next.js App Router pages
│   ├── components/        # Shared UI components
│   ├── lib/               # Utilities, helpers, constants
│   ├── hooks/             # Custom React hooks
│   ├── stores/            # Zustand stores (cart, wishlist, auth)
│   ├── types/             # TypeScript type definitions
│   ├── styles/            # Global styles, Tailwind base layer
│   └── data/              # Static data, mock data for dev
├── prisma/
│   └── schema.prisma      # Database schema
├── tailwind.config.ts
├── next.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 2. App Router Structure (Pages)

```
src/app/
├── layout.tsx             # Root layout (fonts, global providers)
├── page.tsx               # Landing page
├── globals.css            # Tailwind directives + global styles
├── (storefront)/          # Route group for customer-facing pages
│   ├── products/
│   │   ├── page.tsx       # Product listing with filters
│   │   └── [slug]/
│   │       └── page.tsx   # Product detail page (PDP)
│   ├── compare/
│   │   └── page.tsx       # Camera comparison view
│   ├── cart/
│   │   └── page.tsx       # Shopping cart
│   ├── checkout/
│   │   └── page.tsx       # Checkout flow
│   ├── account/
│   │   ├── page.tsx       # Account overview
│   │   ├── orders/
│   │   │   └── page.tsx   # Order history
│   │   └── wishlist/
│   │       └── page.tsx   # Saved items
│   └── search/
│       └── page.tsx       # Search results
├── (admin)/               # Route group for admin dashboard
│   └── admin/
│       ├── layout.tsx     # Admin layout (sidebar nav, light theme)
│       ├── page.tsx       # Dashboard overview
│       ├── products/
│       │   ├── page.tsx   # Product/inventory management
│       │   └── [id]/
│       │       └── page.tsx  # Edit product
│       ├── orders/
│       │   └── page.tsx   # Order management
│       └── settings/
│           └── page.tsx   # Admin settings
├── api/                   # API routes
│   ├── products/
│   ├── cart/
│   ├── orders/
│   ├── reviews/
│   └── auth/
└── not-found.tsx          # Custom 404 page
```

## 3. Components Directory

```
src/components/
├── ui/                    # Base UI primitives
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── ConditionBadge.tsx # Mint/Excellent/Good/Fair color-coded badge
│   ├── CornerBracket.tsx  # Viewfinder bracket frame component
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   ├── Toast.tsx
│   ├── Skeleton.tsx       # Skeleton loader component
│   └── index.ts           # Barrel export
├── layout/                # Structural components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── Container.tsx
│   ├── AdminSidebar.tsx
│   └── CartDrawer.tsx
├── product/               # Product-specific components
│   ├── ProductCard.tsx
│   ├── ProductGrid.tsx
│   ├── ProductGallery.tsx
│   ├── ProductSpecs.tsx
│   ├── CompareTable.tsx
│   └── FilterSidebar.tsx
├── landing/               # Landing page section components
│   ├── Hero.tsx
│   ├── TrustStrip.tsx
│   ├── EditorialSection.tsx
│   ├── BrandGallery.tsx
│   ├── FeaturedCarousel.tsx
│   ├── ConditionExplainer.tsx
│   ├── Testimonials.tsx
│   └── NewsletterCTA.tsx
├── checkout/              # Checkout flow components
│   ├── ShippingForm.tsx
│   ├── PaymentMethod.tsx
│   ├── OrderSummary.tsx
│   └── OrderConfirmation.tsx
└── admin/                 # Admin-specific components
    ├── StatsWidget.tsx
    ├── InventoryTable.tsx
    ├── OrderTable.tsx
    └── ListingForm.tsx
```

## 4. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files & folders | kebab-case | `product-card.tsx`, `use-cart.ts` |
| Components (file) | PascalCase | `ProductCard.tsx` |
| Components (export) | PascalCase | `export function ProductCard()` |
| Hooks | camelCase with `use` prefix | `useCart`, `useScrollAnimation` |
| Stores | camelCase with `Store` suffix | `cartStore.ts` |
| Types/Interfaces | PascalCase | `Product`, `OrderStatus` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_COMPARE_ITEMS` |
| API routes | kebab-case paths | `/api/products/[id]` |
| CSS classes | Tailwind utilities | (no custom class naming needed) |
| Database tables | snake_case (Prisma maps) | `order_items` |

## 5. Import Conventions

Use absolute imports via the `@/` path alias:

```ts
// Good
import { Button } from '@/components/ui'
import { useCart } from '@/hooks/use-cart'
import { Product } from '@/types'

// Bad
import { Button } from '../../../components/ui/Button'
```

## 6. Co-location Rules

- Component-specific types live in the same file if small, or in a
  `types.ts` sibling file if complex.
- Component-specific hooks live in `src/hooks/` (not co-located) for
  reusability.
- Page-specific data fetching lives in the page file itself (Next.js
  server component pattern).
- Test files live alongside their source: `ProductCard.test.tsx` next to
  `ProductCard.tsx`.

## 7. Key Files to Create First

When scaffolding the project, create in this order:
1. `package.json` + install dependencies
2. `tailwind.config.ts` with design tokens from `ui-design.md`
3. `src/app/layout.tsx` with fonts and global providers
4. `src/app/globals.css` with Tailwind directives
5. `src/components/ui/` base components (Button, Badge, CornerBracket)
6. `src/app/page.tsx` landing page skeleton
7. Build out sections incrementally per the landing page spec
