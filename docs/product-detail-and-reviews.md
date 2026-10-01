# RePXL — Product Detail: Ratings, Reviews & Sold Count

Covers the product detail page (`/products/[slug]`) rating summary, the redesigned
**Customer Reviews** section, the centralized rating aggregation shared across the
app, and the real **sold count**. Rating and sold data are always REAL — never
fabricated. A product with no reviews shows an explicit unrated state, and a
product that has never sold simply omits the "N sold" label.

---

## 1. Terminology

RePXL's data model has ONE record type: a `Review` (Prisma `Review`, client
`Review` in `src/stores/reviewStore.ts`) that always carries a `rating` (Int
1–5) and a `comment`. There is no separate "rating-only" record and no review
`title` field. So a product's **rating count == review count** — the UI uses
"ratings" for the numeric summary (e.g. "128 ratings") and "Customer Reviews"
for the list, both backed by the same records. We never label N reviews as a
different N ratings.

---

## 2. Centralized rating aggregation (`src/lib/rating-aggregate.ts`, pure)

A single framework-free module is the source of truth for turning `Review[]`
into a rating. Every surface uses it, so a product can't show `4.9` on the
Cameras page and `4.7` on its detail page.

- `aggregateRatings(reviews)` → `{ average, count, distribution }`
  - `average` = arithmetic mean of the real `rating` values (0 when none).
  - `count` = number of reviews.
  - `distribution` = exact per-star counts (`{5,4,3,2,1}`).
  - Malformed/out-of-range ratings (not an integer 1–5) are ignored, never
    coerced, so bad data can't skew the number.
- `averageRatingFor(reviews, predicate)` — average for one product from a mixed
  list (used to build the catalog's `ratingBySlug`).
- `formatAverage({average,count})` — one-decimal string (`"5.0"`, `"4.9"`,
  `"4.3"`); returns **null** when unrated so callers render "No ratings yet"
  instead of a misleading `0.0`.
- `roundedStars(average)` — nearest whole star (0–5) for solid-star rendering.
- `ratingCountLabel(count)` — correct singular/plural (`"1 rating"`,
  `"28 ratings"`).
- `filterReviewsByRating(reviews, filter)` — All (null) or an exact star.
- `parseRatingFilter(raw)` — parses `?rating=` (`"5"` → 5, `"all"`/invalid → All).
- `REVIEWS_PAGE_SIZE = 5`, `STAR_VALUES = [5,4,3,2,1]`.

**Consumers (all centralized):** `ProductCard`, the catalog page's
`ratingBySlug`, the review store's `getAverageRating`/`getReviewCount` (which the
Compare page uses), the PDP rating summary, and the PDP Customer Reviews section.

Review-list pagination reuses the existing pure `paginate` / `clampPage` /
`pageWindow` helpers from `src/lib/catalog-filters.ts` and the shared
`Pagination` component.

---

## 3. Rating summary beside the product info

`ProductRatingSummary` (in `products/[slug]/page.tsx`) renders next to the price:

```
4.9  ★★★★★  (128 ratings)  ·  342 sold
```

- Numeric average (one decimal) + solid stars (rounded) + `ratingCountLabel`.
- The whole cluster carries an accessible label like
  `Rated 4.9 out of 5 stars from 128 ratings`; the star glyphs are `aria-hidden`
  so screen readers don't double-announce.
- **Unrated:** shows empty stars + "No ratings yet" (no `0.0`).
- **Sold:** "N sold" appears only when the real sold count is known and > 0;
  it's independent of ratings.

---

## 4. Customer Reviews section

`ProductReviews` fetches ALL of the product's reviews once
(`GET /api/reviews?productSlug=…&limit=1000`) and derives everything client-side
so the distribution and filtered pagination are accurate across the full set.

Layout (desktop `summary | distribution`, stacks on mobile):

- **Prominent summary card** — big `X / 5`, stars, `ratingCountLabel`.
- **Rating distribution** — one restrained bar per star (5→1) with the real
  count at the end. Bars are visual only; the numeric count is always shown too,
  so meaning never depends on bar length or color alone.
- **Segmented star filter** — modern pill controls: `All (128)`, `5 Star (105)`,
  … `1 Star (1)`. Counts are the REAL per-star distribution. Selected pill uses
  `aria-pressed` + a filled accent state.

### Pipeline: ALL → FILTER → PAGINATE

The review list filters by the selected star FIRST, then paginates the filtered
result (5/page). So selecting `5 Star (105)` yields 105 reviews → 21 pages; `All
(128)` → 26 pages; switching the filter recomputes pagination. **Changing the
filter always resets to page 1.** Pagination reuses the accessible `Pagination`
component (Prev disabled on page 1, Next on the last, intelligent ellipsis).

### Review cards

Each card shows the real: star rating (+ numeric), reviewer display name (already
stored privacy-safe as "First L."), Verified Purchase badge **only** when the
record's real `verifiedPurchase` is true, review date, comment, and any review
photos. No emails/order IDs/full names are exposed.

### Empty states

- No reviews at all → "No ratings yet / Be the first to share your experience."
- Selected star has none → "No {n}-star reviews for this camera." + a
  "Back to all reviews" reset. Neither looks like an error.

### URL state

The selected star and page are mirrored as `?rating=` and `?reviewPage=` via
`history.replaceState` (no new history entries, existing product params
preserved; page 1 / All omit their param). A screen-reader `role="status"`
line announces "Showing page X of Y, N matching reviews".

### Accessibility

Accessible star text, `aria-pressed` filter pills, labeled Prev/Next, announced
current page, distribution counts shown as text (not bars alone), keyboard
navigation, and visible focus rings throughout.

### Review submission

Unchanged. The `ReviewForm`/submission rules and the server's
verified-purchase logic (see §5) are untouched by this work.

---

## 5. Sold count (real completed sales)

**Definition:** `soldCount = SUM(OrderItem.quantity)` for order items whose parent
`Order.status ∈ { DELIVERED, COMPLETED }`.

- Computed server-side in `GET /api/products/[slug]` with a **single Prisma
  aggregate** (no per-order loop, no N+1):
  ```ts
  prisma.orderItem.aggregate({
    _sum: { quantity: true },
    where: { productId, order: { status: { in: ['DELIVERED', 'COMPLETED'] } } },
  })
  ```
- Excluded: `PROCESSING` (paid but not yet fulfilled), `CANCELLED`, and any
  unpaid/failed orders (`PaymentStatus` PENDING/FAILED/REFUNDED never reach a
  DELIVERED/COMPLETED status). Cart adds and checkout attempts are not orders, so
  they're excluded by construction.
- **Quantities are summed**, not order records: orders of qty 2 + 1 + 3 → 6 sold.
- Never sold → returns **0** (not null, not fabricated).
- This mirrors the existing verified-purchase definition already used by
  `POST /api/reviews`, so "sold" and "verified purchase" stay consistent.

**No schema change / migration was introduced.** The count is derived from
existing `OrderItem.quantity` + `Order.status`. `soldCount` is surfaced only on
the single-product detail response (`ApiProduct.soldCount` →
`Product.soldCount`); list endpoints omit it. The client PDP fetches it via
`productService.getBySlug(slug)` into local state; on fetch failure the UI simply
omits "N sold" rather than showing a placeholder.

If a future need arises to show sold counts in list views at scale, that would
be a separate, approved change (e.g. a batched aggregate) — not a denormalized
counter column.

---

## 6. Compare page heading

`/compare` now uses the same centered heading treatment as the Cameras page
(`mx-auto max-w-2xl text-center`, `font-display text-display-lg`, centered
eyebrow + subtitle). Only the heading area changed; the comparison table/cards,
picker, and the rating spec row (which uses the centralized
`getAverageRating`, one decimal) are unchanged.

---

## 7. Tests & verification

- `src/lib/rating-aggregate.test.ts` — average, one-decimal display (incl.
  no-excessive-precision), total count, per-star counts (5/4/3/2/1), All vs exact
  star filtering, filter→paginate order + filtered pagination totals, no-review
  and empty-selected-star states, singular/plural labels, `?rating=` parsing.
- `src/lib/products-sold-count.test.ts` — sums `OrderItem.quantity`; only
  DELIVERED/COMPLETED (cancelled/failed/processing excluded); multiple quantities
  (2+1+3=6); 0 when never sold; 404 for missing product. Prisma-mock pattern.
- `src/app/(storefront)/products/[slug]/pdp-reviews.test.ts` — structural: PDP
  summary uses centralized aggregation + sold; unrated state; Customer Reviews
  distribution/filters/filter-before-paginate/reset-page/URL-state/empty-states/
  status; ProductCard + catalog + store all use `aggregateRatings`; sold-count
  aggregate shape; Compare centered heading.

Results after this change:
- `npx tsc --noEmit` — clean.
- `npx vitest run` — full suite **1091 passed / 47 skipped / 9 failed**. The 9
  failures are the pre-existing **mobile AI concierge** tests
  (`src/lib/mobile-features.test.ts`, `src/lib/mobile-all-modules.test.ts`) — a
  documented known limitation unrelated to this work; none of those files were
  touched. All new and rating/review/product/catalog/compare tests pass.
- `npm run build` — succeeds (exit 0); `/products/[slug]` ≈12.2 kB, `/compare`
  and `/products` build cleanly.

**Database-dependent limitation:** the sold-count query and review aggregates
were verified via unit tests with a mocked Prisma client and via a clean
production build. They were **not** executed against a live database (local
Supabase connectivity is unavailable; no DB config was changed). Live end-to-end
values should be confirmed once the database is reachable.
