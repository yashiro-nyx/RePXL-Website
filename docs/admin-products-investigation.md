# Admin Products investigation — 2026-09-09/10

Production inspected: https://repxlph.vercel.app/. Fixes are local; nothing was committed, pushed, or deployed. No migration or production data repair was performed.

## A–D. Canon and the brand dropdown

The implemented product-management screen is `/admin/cameras`. `/admin/products` is an unrelated inventory placeholder.

**Root cause:** the dropdown collected unique brands from the first unfiltered **10-product page**, sorted by descending creation time. The production catalog contains 19 products. Its first page contains Panasonic, Sony, Nikon, Fujifilm, and Kodak; both Canon products fall on page two. The observed five-brand dropdown was reproduced in the authenticated production UI.

Read-only Neon queries targeted RePXL project `young-art-47847925`, production branch `br-weathered-breeze-azma8ewu`. The search used `lower(btrim(brand)) = 'canon' OR lower(btrim(name)) LIKE '%canon%'`. Both matching rows have exactly `Canon` as their brand:

| Product | ID | Slug | Status | Stock | Price | Updated at (UTC) |
|---|---|---|---|---:|---:|---|
| Canon IXUS 400 | cmthcpdtl0008ka8kdsvbp8ty | canon-ixus-400 | ACTIVE | 13 | 3499 | 2026-09-09 11:18:18.150 |
| Canon PowerShot A520 | cmthcpcyj0002ka8ki3iw4trs | canon-powershot-a520 | ACTIVE | 11 | 4299 | 2026-09-09 11:18:33.147 |

These products were not missing, deactivated, or misbranded at inspection time. No trim/case inconsistency explained their omission. Neither product was recreated or changed.

**Before:** `Array.from(new Set(mapped.map(p => p.brand)))` ran only for unfiltered page one.

**After:** `GET /api/admin/products/brands` requires server-side admin authentication and selects distinct brands across the entire catalog, without pagination, search, or status restrictions. The page loads those options independently of the paginated results. Existing product filtering remains in `/api/products`, where brand and search are combined. No brand was hardcoded into the filter.

## E–G. Production save failure, endpoint, and database result

**Confirmed reproduction: CASE A — validation rejected the mutation; the row did not change.**

The table used its own paginated state, while `CameraModal` initialized its form from `useProductStore.products`. That separate store hydrates only ACTIVE products and is not initialized by a direct visit to `/admin/cameras`. On a direct production visit, opening Edit for Panasonic Lumix DMC‑LC20 produced empty fields, stock zero, and the default Canon brand/image. Inactive products are also excluded from that store even when it has been hydrated. Form state did not wait for an authoritative product read.

Production record before and after the attempted save:

| Field | Value |
|---|---|
| ID | cmtu156x60000wpuv4nrfhume |
| Slug | panasonic-lumix-dmc-lc20 |
| Name | Panasonic Lumix DMC‑LC20 |
| Brand | Panasonic |
| Stock | 5 |
| Price | 2199 |
| Status | ACTIVE |
| Updated at | 2026-09-09 11:43:25.002 UTC — unchanged |

The existing name and price were entered in that empty edit form, then its real submit handler was invoked. It used:

`CameraModal → productStore.updateProduct → productService.update → clientToApiProduct → apiClient.put → PUT /api/products/panasonic-lumix-dmc-lc20`.

The submitted body was:

```json
{
  "slug": "panasonic-lumix-dmc-lc20",
  "name": "Panasonic Lumix DMC‑LC20",
  "brand": "Canon",
  "series": "",
  "price": 2199,
  "condition": "EXCELLENT",
  "image": "/images/product-canon-a520.svg",
  "stock": 0,
  "description": "",
  "status": "ACTIVE",
  "megapixels": 0,
  "zoom": "",
  "storage": "",
  "year": 2000
}
```

Expected successful contract: HTTP 200 with `{ "success": true, "data": <updated product> }`, followed by a fresh paginated GET.

Actual response: HTTP **422**, `success: false`, `error: "Validation failed"`, with details:

- `series: Series is required`
- `description: Description is required`
- `megapixels: Number must be greater than 0`
- `zoom: String must contain at least 1 character(s)`
- `storage: String must contain at least 1 character(s)`

The API authenticated the admin, found the product, then rejected the body before `prisma.product.update`. The client threw `ApiClientError`; the form's catch invoked `reportActionFailure`, which contains the literal “We could not confirm the change. Please refresh and try again.” The production toast was reproduced. No success-path refetch ran. A second authoritative Neon SELECT confirmed that the record, including its timestamp, was unchanged.

There is no evidence that this reproduced request was a successful mutation followed by failed confirmation (B), stale-store confirmation (C), failed admin authentication (D), or a database timeout (E). This does not establish the cause of every historical occurrence of the generic toast.

Other existing mutation paths remain POST `/api/products` for creation and PATCH `/api/products/[slug]` for archive/status updates. The PUT/PATCH/POST server mutation implementations were not changed.

## H–I. Authentication and hydration

`getCurrentAdmin` reads only `repixl-admin-session-token`, verifies its HMAC and one-hour expiry, and requires an existing unarchived ADMIN user in PostgreSQL. A customer cookie cannot authorize a mutation or the new brand endpoint. Existing admin/customer session code was not changed.

Regression tests cover missing/forged/expired admin cookies, a customer-only cookie, the wrong database role, archived admins, and valid admin access with a customer cookie also present.

The generic toast was not an explicit comparison against Zustand after saving. Normal successful mutations already use the API's returned product. The admin table reload uses its own request path, independent of `hydrate()`.

The fix therefore preserves `hydrateInFlight` deduplication unchanged. Admin edit and list requests use `cache: 'no-store'`; a mutation triggers a new authoritative list request. Older list responses cannot overwrite newer search/page results. Tests verify normal hydrate deduplication and that an in-flight storefront hydrate does not block the admin read.

## J. Font warning

The production CSS maps:

- `e4af272ccee01ff0-s.p.woff2` → Inter, used by `font-body`.
- `bb3ef058b751a6ad-s.p.woff2` → JetBrains Mono, used by `font-mono` stock and price cells.

Both fonts are declared once in the root layout with the Latin subset and `display: 'swap'`. The admin page can initially render no content while authentication resolves, then show loading rows before monospaced numbers appear. A preload may therefore precede visible use by several seconds.

Classification: **A — a browser performance warning**, with a timing explanation consistent with the observed delayed content. Both fonts are used by the screen; no evidence showed a broken font configuration. The original warning did not identify a full filename, so it cannot be attributed uniquely to one of the two files. Fonts were not changed. Font loading cannot explain the API's explicit 422 validation response or the first-page brand derivation.

## K–L. Changes

| File | Change |
|---|---|
| `src/app/(admin)/admin/cameras/page.tsx` | Independent brand loading; fresh product read before opening an editable form; shared mapper preserves description; latest-request list handling; inline validation/session errors; save-in-progress control; separate successful-save/failed-refresh state; archive response errors are no longer swallowed. |
| `src/app/api/admin/products/brands/route.ts` | New authenticated, dynamic, complete brand query. |
| `src/lib/data/adminProductService.ts` | Uncached admin list/detail/brand reads and contextual save error messages. |
| `src/lib/data/adminProductService.test.ts` | 13 service/store regression tests. |
| `src/lib/admin-products-security.test.ts` | 10 API/filter/authentication regression tests. |
| `docs/admin-products-investigation.md` | This report. |

No schema, authentication helper, payment, order, inventory-finalization, notification, or font changes.

## M–O. Automated verification

- Targeted suite: **151 passed, 0 failed, 0 skipped** across three files (23 new regressions plus 128 existing server-authority tests).
- Full `npm test`: **599 passed, 0 failed, 0 skipped** across 30 files. Existing database-dependent suites ran against fresh disposable local PostgreSQL databases; production was not used for tests.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed, including compilation, lint/type validation, and static page generation.
- `git diff --check`: passed.

## P–Q. Browser verification and limits

Production: authenticated UI inspection, missing Canon dropdown reproduced, empty edit form reproduced, real PUT returned 422, exact toast observed, and Neon before/after SELECT confirmed no persisted change. No production product was deleted or successfully altered by this investigation.

Local browser verification used an isolated copy of the fixed app, real API routes, real admin login, and a disposable PostgreSQL database with 19 camera fixtures, including an INACTIVE Canon beyond page one:

- Canon appeared while absent from the first result page.
- Options survived page two and a search returning no results.
- Canon plus PowerShot search returned the correct camera.
- Clearing search and selecting All Brands restored 19 total cameras and the 10-row first page, with Canon still in the options.
- The inactive edit form loaded its description, brand, stock, price, status, and specs without relying on storefront hydration.
- A valid price edit returned PUT 200, followed by GET 200, and displayed the saved price without an error.
- An empty description returned PUT 422, kept the form open, and displayed `description: Description is required`.
- A simulated list-only outage after a successful PUT displayed “Camera saved, but the list could not be refreshed.” A direct product read and PostgreSQL SELECT confirmed the saved price (2699).
- Retry restored the correct table state.

Limitations: the fixes have not been deployed, so the new endpoint and fixed UI have not been verified on production. Historical Vercel logs were unavailable: the connector returned no teams and the existing CLI token was invalid. The production diagnosis instead uses the captured request/response, authenticated UI behavior, source trace, and authoritative database reads. No migration, commit, push, or deployment was performed.
