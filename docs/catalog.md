# Phase 4 commerce UX note (2026-10-08)

Brand discovery remains text-led and uses the existing catalog camera photography;
this implementation does not render SVG brand/logo assets.

The sticky result toolbar and sort control also use the shared theme-aware
control tokens, and the All Cameras icon uses semantic foreground colors so the
catalog remains readable in both dark and warm light modes.

The catalog keeps its existing real-data filter pipeline and pagination. The
desktop filter sidebar and result/sort toolbar now remain contextually visible
while browsing long result sets; mobile continues to use the accessible bottom
sheet filter drawer. No filter taxonomy or backend behavior changed.

# RePXL — Cameras Catalog (`/products`)

The customer-facing camera catalog: centered brand discovery, a modular filter
sidebar/drawer with a dual-handle price slider, facet counts, a custom sort
listbox, active-filter chips, a paginated product grid, and an improved empty
state. This documents the current (V2) implementation.

**Brand filtering is centralized in a single place** — the "Shop cameras by
brand" selector. The redundant Brand group has been removed from the filter
sidebar so there is exactly one brand-filter control (with the selected brand
also shown as a removable active-filter chip). The brand selector reuses the
**same existing product image references** the product cards already render
(one representative product per brand, chosen programmatically from catalog
data) — no new brand-sample assets are created. The sidebar also gained two
extra filters backed by real structured spec fields: **Resolution (megapixels)**
and **Release era (year)**.

---

## 1. Page hierarchy

`src/app/(storefront)/products/page.tsx` composes, top to bottom:

1. Contextual **Back** button — only when arriving via a homepage promo
   (`from=home`); see [`back-navigation.md`](./back-navigation.md).
2. Centered editorial **heading + intro**.
3. Centered **brand discovery** ("Shop cameras by brand").
4. **Catalog toolbar** (result count + custom Sort + mobile Filters button).
5. **Active filter chips**.
6. Left **filter sidebar** (desktop) + **product grid** (right).
7. **Pagination** at the bottom of the grid.

Sections are separated by whitespace and hairlines rather than nested boxes.

---

## 2. Centralized logic (`src/lib/catalog-filters.ts`, pure)

One framework-free module powers the desktop sidebar, the mobile drawer, the
chips, pagination, and the tests, so behavior can't diverge:

- `applyFilters(products, filters, ratingBySlug)` — brand, condition, price
  (inclusive, either bound optional), in-stock, minimum rating, **megapixel
  buckets** (real `specs.megapixels`), and **release-era buckets** (real
  `specs.year`). Each new group ORs its selected buckets and ANDs across groups.
- `sortProducts(products, sort, ratingBySlug)` — `newest`, `price-asc`,
  `price-desc`, `rating-desc`.
- `priceBounds(products)` / `priceStep(spread)` — **dynamic** slider floor/ceiling
  derived from real catalog prices (never hardcoded).
- `normalizePriceAgainstBounds(price, bounds)` — clamps, prevents crossed
  handles, collapses a full-range selection to "no filter".
- `conditionCounts` / `ratingCounts` — real facet counts that respect the other
  active filter groups. (`brandCounts` still exists for reuse but the sidebar no
  longer renders a Brand group.)
- `megapixelOptions(products)` / `megapixelCounts(...)` and
  `eraOptions(products)` / `eraCounts(...)` — **data-derived** bucket lists that
  hide empty bands, plus facet counts respecting the other groups. Standard
  digicam resolution tiers and half-decade eras are used as the band
  definitions; no band appears unless real products fall in it.
- `megapixelLabel(id)` / `eraLabel(id)` — human labels for active-filter chips.
- `representativeProductForBrand(products, brand)` /
  `brandRepresentativeImages(products, brands)` — pick one representative product
  per brand (in-stock first, then newest year, then slug) and reuse its existing
  `image`. No new assets, no image inspection.
- `paginate(items, page, size)`, `clampPage`, `pageWindow(current, total)`
  (ellipsis), `PAGE_SIZE = 12`.
- `hasActiveFilters` / `activeFilterCount` (sort is **not** a filter; megapixel
  and era groups count toward both).
- `brandLogo(brand)` / `canonicalizeBrand(raw, brands)`.

Supported filters are limited to fields that actually exist on the Prisma
`Product` model + real review ratings: availability (`stock`), price (`price`),
condition (`condition`), customer rating (reviews), megapixels
(`specs.megapixels`), and release era (`specs.year`). Camera type/category,
sensor/format, and lens mount are **not** modeled in the schema, so no such
filters were fabricated.

The page holds a single `CatalogFilters` object + `sort` + `page`, and passes one
`sidebarProps` object to both the desktop `FilterSidebar` and the
`MobileFilterDrawer`.

**Pipeline order:** ALL → FILTER → SORT → PAGINATE → render current page.

---

## 3. Components (`src/components/product/catalog/`)

| Component | Role |
|---|---|
| `BrandSelector` | Centered premium brand tiles showing each brand's **existing product image** (reused catalog asset, one representative product per brand), "All Cameras" reset, restrained selected accent (underline), horizontal rail on mobile |
| `CatalogToolbar` | Result count + custom Sort listbox + mobile Filters button |
| `FilterSidebar` | Modular sections (Availability, Price, Condition, Rating, Resolution, Release era) with facet counts + Clear all; reused on desktop and in the drawer. **No Brand group** — brand is controlled by `BrandSelector` |
| `PriceRangeSlider` | Accessible dual-handle slider (two overlaid range inputs, styled track/handles) |
| `SortListbox` | Custom accessible listbox (no native `<select>`) |
| `Pagination` | Prev/Next + numbered pages with ellipsis |
| `MobileFilterDrawer` | Wraps `FilterSidebar` in a labeled modal sheet (scroll-lock, Escape, Apply/Done) |
| `ActiveFilterChips` | Removable chips + Clear all; hidden when empty |
| `CatalogEmptyState` | Professional no-results state + Clear Filters |
| `StarRating` | Presentational stars for the rating filter |
| `ProductCard` (existing) | Unchanged — keeps wishlist/compare/cart + product-detail links |

---

## 4. Brand discovery & centralized brand filter

The selector renders **only brands present in the catalog**. Each brand tile
shows the **same existing product image reference** the product cards already
render — `brandRepresentativeImages(products, brands)` picks one representative
product per brand (in-stock first, then newest release year, then slug for a
stable tie-break) and reuses its `product.image`. This trusts the product→brand
relationship already established by the catalog data; **no new brand-sample
assets are created**, no `canon-sample`/`sony-sample`/etc. duplicates exist, and
no image is opened, analyzed, or converted. A brand with no products is simply
omitted; if a representative product ever lacks an image, the tile falls back to
the typeset brand name.

**Single centralized brand-filter state.** Clicking a brand tile filters the
catalog to that brand; clicking it again (or "All Cameras", or removing the
brand chip) resets to all cameras. **"All Cameras"** is a distinct reset/view-all
control, not a fake brand. The Brand group was removed from the filter sidebar
to avoid a second, redundant brand control — the selected brand still appears as
a removable active-filter chip (`Canon ×`), and **Clear All** also clears it.
`/products?brand=canon&from=home` initializes Canon selected and preserves the
`from=home` Back context.

## 4a. Extra spec filters (real structured fields only)

- **Resolution (megapixels)** — buckets over the real `specs.megapixels` field
  (`Under 5 MP`, `5–8 MP`, `8–12 MP`, `12 MP & up`). Only bands that contain
  products are shown.
- **Release era** — buckets over the real `specs.year` field (`Pre-2000`,
  `2000–2004`, `2005–2009`, `2010–2014`, `2015 & newer`). Only bands that
  contain products are shown.

Both use checkboxes (multi-select, OR within group), show facet counts that
respect the other active groups, and appear as removable chips. No specification
value is invented.

---

## 5. Ratings are REAL (no fabrication)

The Rating filter (4/3/2/1 & up, plus "Any rating") and the "Highest Rated" sort
use **actual review data**: the page aggregates per-product averages from
`useReviewStore` (hydrated from `/api/reviews`) into `ratingBySlug`. Unrated
products are excluded when a minimum-rating filter is active — never treated as
highly rated — and `ProductCard` shows "Unrated" for products with no reviews.
Rating facet counts derive from the same real data.

`ratingBySlug` and `ProductCard`'s per-product average are both computed through
the centralized `aggregateRatings` helper in `src/lib/rating-aggregate.ts`, the
same helper the product detail page and Compare page use — so a product's average
is identical on the Cameras page, its detail page, and Compare. See
[`product-detail-and-reviews.md`](./product-detail-and-reviews.md).

---

## 6. Price — dual-handle slider + inputs (draft → Apply)

- Slider bounds are the **dynamic catalog min/max** (`priceBounds`), stepped
  sensibly for the price spread.
- Two draggable handles (accessible via `aria-valuemin/max/now`, arrow keys,
  touch) plus synchronized Minimum/Maximum number inputs — dragging updates the
  inputs and vice-versa.
- Handles cannot cross; values are clamped to the catalog range; invalid/empty
  input is normalized.
- All of this updates a **draft** only. The grid refilters exactly when **Apply
  Price** is pressed. Apply resets pagination to page 1, updates chips and the
  count, and preserves other filters, sort, and `from=home`.
- **Clear All** restores the full catalog range and resets the inputs.
- The slider is styled via the `.range-thumb` rules in `globals.css` (not a raw
  native range).

---

## 7. Sort — custom listbox

`SortListbox` replaces the native `<select>`: a styled trigger with a chevron,
a popover of options with the selected one checked, full keyboard support
(open/close, Up/Down/Home/End, Enter/Space to select), Escape and click-outside
to close, and ARIA `listbox`/`option` semantics. Changing sort resets to page 1
and preserves filters + `from=home`. No new dependency was added.

---

## 8. Pagination

`PAGE_SIZE = 12`. Pagination runs on the filtered+sorted set. The current page is
reflected in the URL (`/products?page=2`; page 1 omits the param), preserving
compatible params (`brand`, `from`). Any filter/sort change resets to page 1.
Changing pages scrolls smoothly to the results anchor (not the top of the site).
Out-of-range/invalid `?page=` values are clamped gracefully. Prev is disabled on
page 1, Next on the last page, with intelligent ellipsis in the number window.

---

## 9. Responsive & accessibility

- Desktop: persistent left sidebar beside the grid (`lg+`). Tablet/mobile: the
  sidebar is replaced by a Filters button → drawer with the same controls
  (including the dual-handle slider) and background scroll-lock.
- Brand discovery centers on `md+` and becomes a horizontal rail on small screens.
- Filter groups use headings; rating is a radio group; the brand selected state
  is conveyed by tint + underline + `aria-pressed` (not color alone); the sort
  control and slider handles are keyboard-operable with visible focus; the
  drawer is a labeled `role="dialog"` closable via Escape; `prefers-reduced-motion`
  is respected.

---

## 10. Preserved behavior

Contextual Back (`from=home`), the `?brand=` deep link, product-detail links, and
wishlist/compare/cart all continue to work through the untouched `ProductCard`.
The AI Assistant, search, and existing catalog queries are unaffected. No
database schema or business logic changed.

---

## 11. Tests & verification

- `src/lib/catalog-filters.test.ts` — filtering (incl. megapixel + era groups),
  sorting, price validation, dynamic bounds/step/clamp/normalize, facet counts
  (respecting other groups), data-derived megapixel/era options + counts + chip
  labels, brand→representative-image selection (in-stock/newest/slug ordering,
  omitting brands without products), pagination
  (`paginate`/`clampPage`/`pageWindow` ellipsis), brand-asset registry,
  `canonicalizeBrand`.
- `src/components/product/catalog/catalog-ui.test.ts` — composition,
  FILTER→SORT→PAGINATE + URL page state + reset-on-change + scroll-to-results,
  `from=home` + Clear All preservation, brand init, wishlist/compare
  preservation, BrandSelector reuses product images (no fabricated samples),
  sidebar has Resolution/Release era and **no** Brand group, dual-handle slider
  a11y + no-cross, custom sort listbox, pagination UI, drawer scroll-lock/a11y.

Verified after this change:
- `npx tsc --noEmit` — clean (exit 0).
- `npx vitest run` on both catalog test files — **87 tests passed**.
- `npm run build` — **succeeds** (compiled successfully, lint + type validity
  passed; `/products` prerendered as static, ≈10.1 kB / 186 kB First Load JS).
  The build does not touch the database, so the current local Supabase
  unavailability did not affect it and produced no DB-related failures.

**Not verified:** interactive click-through and visual/browser rendering were
NOT performed (no headless rendering/screenshot tooling was used, and per task
constraints no image inspection was done). A manual pass on desktop + mobile is
recommended before release. The full test suite / any DB-backed tests were not
run here because local Supabase is unreachable; only the catalog/UI test files
above were executed.
