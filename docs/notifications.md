# RePXL — Notifications

How customer-facing notifications are generated, stored, formatted, and rendered
— and the rules that keep them polished and free of raw code-like content.

---

## 1. The problem this design solves

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

## 2. Architecture (website)

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

## 3. In-app content rules

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

### Copy by event (in-app)

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

Email keeps using the full, warm, multi-paragraph templates in
`MODERN_DEFAULT_TEMPLATES` (and any admin-edited DB template) — that path is
unchanged.

---

## 4. Storage envelope

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

## 5. Handling legacy / malformed records (non-destructive)

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

Future events are fixed at the source (§1–3), so new malformed rows are not
created.

---

## 6. Categories & navigation

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

## 7. Interaction & sync

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

## 8. Accessibility & responsiveness

- Bell button has an accessible label including the unread count and a visible
  focus ring; dropdown is a labeled `dialog`, closes on outside-click and Escape.
- Unread indicators are labeled; each actionable row exposes a descriptive
  `aria-label`. Long descriptions wrap (`break-words`) rather than overflow.
- The dropdown is full-width on mobile (`left-4 right-4`) and anchored to the
  bell on `sm+`; the full page uses a responsive list and wrapping filter tabs.
- Colors use RePXL `repixl-*` tokens, so light/dark themes are supported.

---

## 9. Tests

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
