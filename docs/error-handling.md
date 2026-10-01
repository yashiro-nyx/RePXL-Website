# RePXL — Customer-Facing Errors, Warnings & Messages

**Project rule:** Customer-facing interfaces must never expose raw validation
objects, stack traces, database errors, internal status messages, or
implementation-specific exception text. All failures shown to customers must be
short, human-readable, and answer at least one of: *what happened / what to do
next / which field or action needs attention.* Detailed diagnostics stay in
server logs.

---

## 1. The reported bug (root cause)

The Return / Refund page displayed raw Zod output, e.g.:

> `Validation error: [{ "code": "too_small", "minimum": 10, "path": ["details"] … }]`

**Root cause:** `POST /api/returns` caught the `ZodError` and returned
`errorResponse(\`Validation error: ${error.message}\`)`. A `ZodError`'s
`.message` is the full JSON array of issues; the return page then rendered the
server's `error` string verbatim. The fix replaces this with the shared safe
mapping (below); the customer now sees:

> **Please describe the issue in at least 10 characters.**

shown next to the Details field (and echoed in a banner if submission fails).

---

## 2. Shared error/message system (`src/lib/errors/`)

Framework-free, usable on server and client, unit-tested.

### `messages.ts`
- `ErrorCode` + `MESSAGES` — the ONLY approved public copy per category
  (validation, unauthenticated, forbidden, not-found, conflict, rate-limited,
  server, service-unavailable, network, unknown).
- `codeFromStatus(status)` / `messageFromStatus(status)` — HTTP status → safe copy.
- `looksTechnical(message)` — guard that flags raw JSON, Zod codes (`too_small`,
  `invalid_type`, `"path"`), Prisma/`P20xx`, Postgres/Supabase/SQL, stack
  traces, `TypeError`, `Internal server error`, `Failed to fetch`, etc. Used to
  decide whether a server-provided string is safe to show.

### `api-errors.ts` (server-only — imports `next/server`)
- `humanizeZodIssue(issue)` — keeps a human schema message, otherwise
  synthesizes plain guidance ("This field is required.", "Enter a valid email
  address.", "Please enter at least N characters.") from the issue kind. No
  paths/codes/metadata.
- `zodToSafeBody(zodError)` → `{ success:false, code:'VALIDATION', error, fieldErrors, details }`
  where `error` is the first field's friendly message, `fieldErrors` maps field →
  friendly message, and `details` is the same as `"field: message"` strings (all
  humanized — never raw metadata).
- `zodErrorResponse` (422) and `toSafeErrorResponse(error, fallback)` — maps any
  caught error to a safe response (Prisma `P2025` → 404; everything else → a
  generic server/service message).

### `client-errors.ts` (client)
- `messageFromApiBody(body, status)` — prefers the API's `error`/`message`
  **only when it isn't technical**, otherwise the status fallback.
- `getFieldErrors(body)` — safe per-field messages for field-level display.
- `toUserMessageFromResponse(res, body)` and `toUserMessage(error, fallback)` —
  translate a fetch Response / thrown error / network failure into safe copy.
  Network `TypeError` → the NETWORK message; technical strings → the fallback.

### API error contract

```jsonc
// 422 validation
{ "success": false, "code": "VALIDATION",
  "error": "Please describe the issue in at least 10 characters.",
  "fieldErrors": { "details": "Please describe the issue in at least 10 characters." },
  "details": ["details: Please describe the issue in at least 10 characters."] }

// other failures
{ "success": false, "code": "SERVER", "error": "Something went wrong on our side. Please try again in a moment." }
```

`code` is a stable machine value (for logs/tests); `error`/`fieldErrors` are the
approved customer text. Stack traces and DB exceptions are never included.

---

## 3. Message types

- **Error** — an action failed or input must be corrected (red styling + icon,
  never color alone). e.g. *Please select at least one item to return.*
- **Warning** — the user can continue but should understand a consequence
  (amber). e.g. *Changing your shipping address may update the delivery fee.*
- **Information** — explains a process. Only state policy/timing RePXL actually
  documents.
- **Success** — confirms completion + a useful next step. e.g. *Your return
  request has been submitted.*

---

## 4. Where it's wired

- `src/lib/api.ts` `validationError()` → `zodToSafeBody` (every route that
  catches a `ZodError` and calls `validationError` is now safe).
- Customer-facing routes hardened: `api/returns` (POST + GET),
  `api/notifications`, `api/checkout/process-payment` (gateway message shown only
  when `!looksTechnical`), `api/checkout/payment-intent`,
  `api/checkout/payment-intent/[id]`, `api/checkout/session` (safe fallbacks — no
  `error.message` leak).
- Return / Refund page consumes `getFieldErrors` (field-level) +
  `toUserMessageFromResponse` (banner), with a network `try/catch` guard.
- The client `apiClient` throws `ApiClientError` carrying the server's now-safe
  `error`; stores/pages surface that. Intentional safe messages (e.g.
  `InsufficientStockError`, "Your card was declined.") pass through unchanged.

---

## 5. Accessibility

Field errors use `role="alert"`, are linked via `aria-describedby`, and mark the
input `aria-invalid`. Banners use `role="alert"` + `aria-live`. Errors pair an
icon with text (not color alone). Helper text sits near its field.

---

## 6. Preserved business rules

No validation was loosened. Return details still require ≥ 10 characters, photo
requirements, return eligibility/window, ownership checks, refund policy,
payment, auth, and authorization are unchanged — only how failures are
*communicated* changed.

---

## 7. Known areas intentionally left

Admin-only routes under `src/app/api/admin/**` still format Zod messages with
`Validation error: ${error.message}`. These are **not customer-facing** (admin
dashboard only) and are out of scope for this customer audit; they can be
migrated to `validationError`/`zodToSafeBody` in a follow-up. The improved
`validationError` is already available to them.

---

## 8. Tests & verification

- `src/lib/errors/errors.test.ts` — `looksTechnical` blocks raw Zod/Prisma/SQL/
  stack/status text and allows safe copy; status→message mapping; `humanizeZodIssue`
  / `zodToSafeBody` drop metadata and synthesize friendly copy; client mappers
  never surface technical text; a regression test asserts the exact reported raw
  string is classified technical and replaced.
- `src/lib/returns-api-messages.test.ts` — `POST /api/returns` returns safe
  field messages (details < 10, invalid reason, unauthenticated) with no raw Zod
  metadata in the body (prisma-mock).
- `src/app/(storefront)/account/orders/[orderNumber]/return-page.test.ts` —
  structural: page routes failures through the shared mapper, shows friendly
  copy + real file limits, and wires a11y (`aria-invalid`/`aria-describedby`/
  `role="alert"`).

Results: `npx tsc --noEmit` clean; new tests pass (22); `admin-products-security`
still passes (the `details[]` array shape is preserved, now humanized); full
`npx vitest run` → **1145 passed, 47 skipped, 9 failed** (the 9 are the
pre-existing mobile AI concierge failures — unrelated, untouched); `npm run
build` exit 0.

**Not verified:** a live browser reproduction of the Return/Refund validation was
not performed here (verified via unit/structural tests, type-check, and build).
Recommend a manual pass: submit the return form with 1–9 characters in Details
and confirm the friendly field message appears instead of raw JSON.
