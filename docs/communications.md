# RePXL ? Notifications and Email

This guide combines the in-app notification pipeline and outgoing email design
system. Their delivery and rendering remain distinct; the approved notification
system is preserved. Implementation status and dated verification are tracked in
[the progress checklist](./Group2_ProjectChecklist.md).

- [In-app notifications](#in-app-notifications)
- [Outgoing email](#outgoing-email)
- [Returns and refunds](./returns.md)

## In-app notifications

How customer-facing notifications are generated, stored, formatted, and rendered
— and the rules that keep them polished and free of raw code-like content.

---

### 1. The problem this design solves

The in-app inbox used to store the **email** template body verbatim: a long,
multi-paragraph string full of `{{token}}` placeholders. `emitNotification`
preferred the seeded database template over the caller's plain text, and most
call sites did not supply a complete `context`. `resolvePlaceholders`
deliberately leaves unknown tokens untouched (so the admin template editor can
flag them), so raw fragments like `Order #{{orderNumber}} has been shipped`,
`{{status}}`, `{{refundAmount}}`, and embedded `https://…/{{orderNumber}}` URLs
were written straight into `Notification.message` and shown to customers. Because
the order number never resolved, the click destination (derived by scraping the
text for `RPX-…`) was also lost.

**Root cause:** template-over-caller precedence + incomplete context + a
"leave unknown tokens verbatim" resolver, all feeding the same `message` field
the inbox rendered.

---

### 2. Architecture (website)

```
emit call sites ─▶ emitNotification() ─▶ Notification row (message = envelope)
   (order/return/refund/promo/system)      │
                                           ├─▶ email  (rich resolved template — unchanged)
                                           └─▶ push   (concise content)

GET /api/notifications         ─┐
GET /api/notifications/preview ─┼▶ toNotificationView() ─▶ { title, body, href, category, icon }
                                │        (envelope parse + legacy sanitize + category)
NavBellDropdown / NotificationList ─▶ NotificationRow (one shared component)
```

| Concern | File |
|---|---|
| Concise in-app content, envelope, legacy sanitize, categories | `src/lib/notification-inapp.ts` (pure) |
| Row → display DTO mapper | `src/lib/notification-view.ts` |
| Dispatch (create row, email, push) | `src/lib/notifications.ts` (`emitNotification`) |
| Email/admin templates + token resolver | `src/lib/notification-templates.ts` |
| List / preview / read / read-all / unread-count APIs | `src/app/api/notifications/*` |
| Shared row + states + filters | `src/components/account/NotificationList.tsx` |
| Shared category icons | `src/components/account/NotificationIcon.tsx` |
| Navbar dropdown | `src/components/layout/NavBellDropdown.tsx` |
| Shared unread count/poll | `src/hooks/useNotificationCount.ts` |

The `Notification` model is unchanged (`id, userId, event, message, channel,
isRead, createdAt`). No migration was performed. The title and destination are
carried inside `message` via a compact envelope (below), and the fine-grained
display category is derived at read time.

---

### 3. In-app content rules

Every in-app notification is a concise **`{ title, body, href }`**:

- **title** — a short headline (e.g. *Order Shipped*, *Refund Processed*).
- **body** — one or two natural-language sentences: what happened, which order,
  and any next step. No greetings, no email sign-offs, no inline URLs.
- **href** — a valid internal destination, or `null` when there is no action.

Hard guarantees enforced by `buildInAppNotification` and the sanitizer:

- Never emit an unresolved `{{token}}` or `${expr}`.
- Never emit raw JSON (`{"status":"delivered"}`) or `[object Object]`.
- Never emit a raw URL in the body — the destination lives on `href`.
- Only use values that are actually present in the validated context; if a
  value is missing, fall back to safe generic copy for the event.
- Use consistent RePXL terminology: **Orders, Payments, Shipping, Returns,
  Account & Security, Promotions**. Titles are short; descriptions informative;
  no emojis, no shouting caps.

#### Copy by event (in-app)

| Event | Title | Body shape |
|---|---|---|
| `ORDER_CONFIRMATION` | Order Confirmed | Your order #RPX-… has been confirmed. We're preparing it for shipment. |
| `ORDER_STATUS_CHANGE` (shipped) | Order Shipped | Your order #RPX-… is on its way via {courier}. Tracking: {number}. |
| `ORDER_STATUS_CHANGE` (delivered) | Order Delivered | Your order #RPX-… has been delivered. |
| `ORDER_STATUS_CHANGE` (cancelled) | Order Cancelled | Your order #RPX-… has been cancelled. |
| `ORDER_STATUS_CHANGE` (completed) | Order Completed | Your order #RPX-… is complete. Thanks for shopping with RePXL. |
| `ORDER_STATUS_CHANGE` (other) | Order Update | Your order #RPX-… is now {humanized status}. |
| `RETURN_RECEIVED` | Return Request Received | We received your return request for order #RPX-… and our team is reviewing it. |
| `RETURN_STATUS_CHANGE` | Return Update | Your return request for order #RPX-… is now {status}. |
| `REFUND_COMPLETED` | Refund Processed | Your refund of {amount} for order #RPX-… has been processed. Allow 1–5 business days. |
| `PROMOTION` | {promo title} | {promo body}. Use code {code} at checkout. |
| `REPIXL_UPDATE` | {update title} | {update body}. |

Return submission, admin return-status updates, and refund completion now pass
the lifecycle stage and actual case refund amount where available. Approval,
shipment, receipt, inspection, pending/failed refund, and confirmed completion
updates come from `src/lib/return-service.ts`. Provider pending/processing does
not emit `REFUND_COMPLETED`; confirmed success or recorded completed COD repayment
does. Provider posting times vary; existing template copy is not a provider SLA.
Updates also pass
the actual `orderNumber` and `returnId` in notification context; status updates
also pass the status, and refunds pass the formatted amount. This lets the
existing formatter produce an order-linked notification that mobile can open
through `app/notifications.tsx` into Order Details. The notification pipeline
and preference handling are unchanged. See [returns.md](./returns.md) for
the task's verification and provider/device limitations.

Email keeps using the full, warm, multi-paragraph templates in
`MODERN_DEFAULT_TEMPLATES` (and any admin-edited DB template) — that path is
unchanged.

---

### 4. Storage envelope

Because the schema was not changed, concise content is serialized into the
existing `message` field:

```
RPXN1:{"title":"Order Shipped","body":"Your order #RPX-1024 is on its way.","href":"/account/orders/RPX-1024"}
```

- `serializeInAppContent()` writes it (validating that `href` is internal).
- `parseInAppMessage()` reads it, with three cases:
  1. **Envelope** → parsed content (with a final sanitize pass on the body).
  2. **Legacy plain text** → the event supplies a title, the body is sanitized,
     and an order link is derived if an `RPX-…` number is present.
  3. **Unparseable / empty** → safe generic fallback for the event.

---

### 5. Handling legacy / malformed records (non-destructive)

No database rows are rewritten. Legacy and malformed content is normalized **at
read time** in `toNotificationView`:

- `looksMalformed()` detects the specific shapes the old pipeline produced —
  unresolved `{{…}}` / `${…}`, JSON fragments, `[object Object]`. It is
  deliberately conservative; it does **not** strip every brace (which could hide
  the real problem or damage legitimate text).
- If a legacy body is **clean**, it is kept (greeting and inline URLs trimmed so
  the inbox stays scannable).
- If a legacy body is **malformed**, it is replaced with safe generic copy for
  the event, so a customer never sees raw tokens even for old rows.

Future events are formatted at the source (the notification content rules above), so new malformed rows are not
created.

---

### 6. Categories & navigation

The persistence taxonomy is coarse (`ORDER_UPDATES`, `PROMOTIONS`,
`REPIXL_UPDATES`). For display we derive a finer, honest category from the event
(and, for status changes, the status text) — never from invented data:

`ORDERS · PAYMENTS · SHIPPING · RETURNS · ACCOUNT · PROMOTIONS · UPDATES`

- The full page shows filter tabs for the categories **present in the data**
  (plus *All*), so empty categories are not shown.
- The sidebar subroutes (`/order-updates`, `/promotions`, `/repixl-updates`) map
  each display category back to its coarse backend group via `DISPLAY_TO_BACKEND`,
  so existing routes and the `unread-count` badges keep working.

Destinations (`href`):

| Event | Destination |
|---|---|
| Order / shipping / refund / return | `/account/orders/{orderNumber}` |
| Promotions | `/products` |
| Platform updates with no order | none (row is not clickable) |

Order/return destinations rely on the existing per-route ownership guards — the
notification only provides a link, it grants no access.

---

### 7. Interaction & sync

- Both the dropdown and the full page render the **same** `NotificationRow`.
- Clicking an actionable row marks it read (optimistically), then navigates.
- Rows without a destination are not misleadingly clickable — they expose an
  explicit **Mark read** control instead.
- Read state persists server-side; `PATCH /…/read` is idempotent and ownership-
  checked; `POST /…/read-all` scopes to the session user.
- `useNotificationCount` is the single polling source of truth (20s, paused when
  hidden, refetch on focus). The dropdown decrements it optimistically only when
  an item was actually unread, then the next poll reconciles.
- Both surfaces refetch on focus/visibility, so they stay synchronized and
  notifications don't disappear unexpectedly.

---

### 8. Accessibility & responsiveness

- Bell button has an accessible label including the unread count and a visible
  focus ring; dropdown is a labeled `dialog`, closes on outside-click and Escape.
- Unread indicators are labeled; each actionable row exposes a descriptive
  `aria-label`. Long descriptions wrap (`break-words`) rather than overflow.
- The dropdown is full-width on mobile (`left-4 right-4`) and anchored to the
  bell on `sm+`; the full page uses a responsive list and wrapping filter tabs.
- Colors use RePXL `repixl-*` tokens, so light/dark themes are supported.

---

### 9. Tests

- `src/lib/notification-inapp.test.ts` — per-event copy, missing/malformed
  context, envelope round-trip, legacy parsing, malformed detection, categories.
- `src/lib/notification-view.test.ts` — row → DTO mapping and sanitization.
- `src/lib/notifications-dynamic.test.ts` — in-app stores the concise envelope
  while email keeps the rich resolved template.
- `src/components/account/notification-ui.test.ts` — shared row/icon usage,
  read sync, mark-all, states, category filtering, a11y, API view wiring.
- `src/app/api/notifications/order-notifications.test.ts` — emit contracts,
  ownership, destination derivation.

Run: `npx vitest run notification`.

## Outgoing email

How RePXL's customer-facing emails are designed, composed, and sent. This covers
**outgoing email only**. The in-app notification inbox (dropdown, Notifications
page, `NotificationRow`, `NotificationIcon`) is a separate, completed system and
is intentionally **not** affected by anything here.

---

### 1. Goals

- One consistent, premium, minimalist look across every email.
- A neutral/white canvas with restrained RePXL red accents (not the old dark theme).
- Reusable components so templates never duplicate large blocks of HTML.
- Gmail-compatible markup: table-based layout, inline CSS, no `<style>`/classes/flex/grid.
- Safe content: every dynamic value is escaped; URLs validated; missing data
  omitted rather than faked; never any raw `{{token}}`, `${expr}`, JSON, or
  `[object Object]`.
- A plain-text alternative for every email.

---

### 2. Architecture

```
src/lib/email/
├── tokens.ts       # palette, fonts, max width (light/neutral premium theme)
├── format.ts       # escapeHtml, coerceText, safeUrl, formatPeso, formatEmailDate, normalizePlainText
├── components.ts   # greeting, paragraph, divider, ctaButton, fallbackLink,
│                   # infoCard, card, labeledBlock, orderSummary, callout, codeBlock
├── layout.ts       # renderEmailLayout (header + card + footer), defaultFooterLinks
├── templates.ts    # per-type builders → { subject, html, text }
└── index.ts        # barrel: import from '@/lib/email'
```

Senders keep their existing infrastructure and only shape data + send:

| Email | Sender | Builder |
|---|---|---|
| Order confirmation | `src/lib/order-email.ts` | `buildOrderConfirmationEmail` |
| Order status (shipped/delivered/…) | `src/lib/notifications.ts` (email channel) via `renderBrandedEmailHtml` | shared layout |
| Password reset | `src/app/api/auth/forgot-password/route.ts` | `buildPasswordResetEmail` |
| Password changed (security) | `src/lib/auth-email.ts` | `buildPasswordChangedEmail` |
| Sensitive-change OTP | `src/lib/sensitive-change.ts` | `buildVerificationCodeEmail` |
| Account security notice | `src/lib/sensitive-change.ts` | `buildSecurityNoticeEmail` |
| Newsletter confirmation (marketing) | `src/app/api/newsletter/subscribe/route.ts` | `buildNewsletterConfirmationEmail` |

`renderBrandedEmailHtml` (in `src/lib/mailer.ts`) is a thin compatibility wrapper
that now delegates to `renderEmailLayout`, so the notification email channel and
any other caller inherit the new look with the same props and output contract.
The Gmail SMTP transport (`createTransporter`, `sendNotificationEmail`) and all
notification event triggers are unchanged.

---

### 3. Design tokens (`tokens.ts`)

| Role | Value |
|---|---|
| Canvas | `#f4efe9` (soft neutral) |
| Card surface | `#ffffff` |
| Muted surface | `#faf8f5` |
| Border / strong border | `#e7e1d8` / `#d9d2c7` |
| Text / muted / faint | `#1a1816` / `#6b6560` / `#9c958d` |
| Accent (CTA, rules) | `#c22c2c` |
| Success / warning | `#5a6e4e` / `#b06f1f` |

Fonts: system sans for body/UI, Georgia serif for the wordmark/headings,
Courier monospace for order numbers, codes, and technical labels. Max content
width 600px (single column, comfortable in Gmail mobile).

The red accent is used sparingly: the header rule, the primary CTA, and
important-status highlights — never as a background wash.

---

### 4. Layout (`renderEmailLayout`)

Every email is: neutral canvas → centered RePXL wordmark + short red rule →
white rounded card (heading + body) → minimal footer (brand line, optional
support links, optional unsubscribe, optional legal note).

Options: `title`, `heading?`, `preheader?`, `bodyHtml`, `footerLinks?`,
`unsubscribeUrl?`, `footerNote?`.

- `preheader` sets the hidden inbox-preview snippet.
- `footerLinks` render as underlined support/account links (validated via `safeUrl`).
- `unsubscribeUrl` renders an unsubscribe line **only for marketing emails**.
  Transactional/security emails must not pass it.

---

### 5. Components (`components.ts`)

- `greeting(name)` — "Hi {name}," (escaped; falls back to "there").
- `paragraph(html, { muted, marginTop })`, `divider()`.
- `ctaButton(label, url)` — bulletproof table button; returns `''` for
  unsafe/missing URLs so a broken/misleading CTA is never rendered.
- `fallbackLink(url, note?)` — "copy this link" block for auth emails.
- `infoCard(title, rows)` — titled key/value list; **rows with empty values are
  omitted**, so only fields backed by real data appear. Values are escaped; each
  row supports `mono` and a `tone` (default/muted/success/warning/accent).
- `orderSummary(items, totals)` — line-item table + subtotal/discount/shipping/
  total. Amounts are pre-formatted with `formatPeso`; item names escaped. The
  discount row is omitted when there is no discount.
- `labeledBlock`, `card`, `callout`, `codeBlock` for addresses, notes, and OTPs.

---

### 6. Content rules

Each email answers: what happened, the relevant details, whether action is
needed, and where to find more. Copy is concise, natural, and professional — no
robotic phrasing, no emojis, no shouting caps, consistent RePXL terms
(My Purchases, Orders, Payments, Returns, Account Security).

Subjects and primary CTAs by type:

| Type | Subject | CTA → route |
|---|---|---|
| Order confirmation | `Order confirmed — {orderNumber}` | View Order → `/account/orders/{n}` |
| Order shipped/delivered/… | `{Title} — {orderNumber}` | Track Order / View Order → `/account/orders/{n}` |
| Password reset | `Reset your RePXL password` | Reset Password → `/reset-password?token=…` |
| Password changed | `Security alert: your RePXL password was changed` | Secure My Account → `/forgot-password` |
| Verification code | `Verify your identity — …` | (code, no button) |
| Security notice | `RePXL security: {event}` | (support contact) |
| Newsletter confirm | `Confirm your RePXL subscription` | Confirm Subscription → confirm URL |

Only fields backed by validated data are shown — no invented tracking numbers,
delivery dates, or payment statuses. Auth links keep their existing single-use
tokens and expiry (reset: 1 hour; newsletter: 24 hours; OTP: existing TTL).

---

### 7. Safety

- `escapeHtml` on all interpolated text; `coerceText` converts non-primitives to
  `''` (never `[object Object]`/`undefined`/`NaN`).
- `safeUrl` accepts internal absolute paths and http(s)/mailto only; rejects
  `javascript:`, `data:`, protocol-relative, and malformed URLs. Unsafe URLs make
  the button/link disappear rather than render.
- Every builder produces a plain-text alternative alongside the HTML.

---

### 8. Previews

```
npx tsx scripts/email-previews.mjs
```

Renders HTML + text for all 8 representative emails to `email-previews/`
(gitignored) using realistic sample data. It sends nothing and fails if any
template emits raw/technical content. Open `email-previews/index.html` to review.

---

### 9. Testing

`src/lib/email/email.test.ts` covers format helpers, components, and all seven
builders: subjects, CTA destinations, HTML escaping, omission of missing optional
data, plain-text presence, complete-document structure, unsubscribe-only-when-
provided, and a no-raw-content guard. Mailer and auth-email tests cover sender behavior separately. Consult the
progress checklist for dated results; documentation consolidation did not rerun
the application test suite.

Run: `npx vitest run email mailer auth-email`.

---

### 10. Gmail rendering — limitations & honesty

The markup follows Gmail-safe conventions (tables, inline CSS, no `<style>`,
no web fonts, `role="presentation"`, hidden preheader, bulletproof buttons,
`word-break` for long order numbers/addresses, `color-scheme: light`). However:

- **Actual Gmail rendering has not been verified in a real client.** No live
  send or email-client test (e.g. Litmus/Email on Acid, real Gmail desktop/
  mobile, dark mode) was performed in this change. Treat cross-client rendering
  as "built to spec," not "verified."
- Gmail may clip very long emails ("[Message clipped]"); the templates are
  concise to reduce this risk but it is not eliminated.
- Gmail's dark mode can recolor light backgrounds on some clients; the light
  color-scheme hints reduce but do not guarantee consistent appearance.
- When images are blocked/unavailable there is no impact: the design is
  type-and-border based with no content images.

Recommended before production: send real test messages to Gmail (desktop + iOS/
Android app, light + dark) and spot-check with an email-testing service.
