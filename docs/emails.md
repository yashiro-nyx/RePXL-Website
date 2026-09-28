# RePXL — Outgoing Email Design System

How RePXL's customer-facing emails are designed, composed, and sent. This covers
**outgoing email only**. The in-app notification inbox (dropdown, Notifications
page, `NotificationRow`, `NotificationIcon`) is a separate, completed system and
is intentionally **not** affected by anything here.

---

## 1. Goals

- One consistent, premium, minimalist look across every email.
- A neutral/white canvas with restrained RePXL red accents (not the old dark theme).
- Reusable components so templates never duplicate large blocks of HTML.
- Gmail-compatible markup: table-based layout, inline CSS, no `<style>`/classes/flex/grid.
- Safe content: every dynamic value is escaped; URLs validated; missing data
  omitted rather than faked; never any raw `{{token}}`, `${expr}`, JSON, or
  `[object Object]`.
- A plain-text alternative for every email.

---

## 2. Architecture

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

## 3. Design tokens (`tokens.ts`)

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

## 4. Layout (`renderEmailLayout`)

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

## 5. Components (`components.ts`)

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

## 6. Content rules

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

## 7. Safety

- `escapeHtml` on all interpolated text; `coerceText` converts non-primitives to
  `''` (never `[object Object]`/`undefined`/`NaN`).
- `safeUrl` accepts internal absolute paths and http(s)/mailto only; rejects
  `javascript:`, `data:`, protocol-relative, and malformed URLs. Unsafe URLs make
  the button/link disappear rather than render.
- Every builder produces a plain-text alternative alongside the HTML.

---

## 8. Previews

```
npx tsx scripts/email-previews.mjs
```

Renders HTML + text for all 8 representative emails to `email-previews/`
(gitignored) using realistic sample data. It sends nothing and fails if any
template emits raw/technical content. Open `email-previews/index.html` to review.

---

## 9. Testing

`src/lib/email/email.test.ts` covers format helpers, components, and all seven
builders: subjects, CTA destinations, HTML escaping, omission of missing optional
data, plain-text presence, complete-document structure, unsubscribe-only-when-
provided, and a no-raw-content guard. `mailer.test.ts` and `auth-email.test.ts`
continue to pass, and the full notification suite passing confirms the in-app
system is untouched.

Run: `npx vitest run email mailer auth-email`.

---

## 10. Gmail rendering — limitations & honesty

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
