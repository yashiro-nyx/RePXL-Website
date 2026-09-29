# RePXL — Website Floating Chat Widget (AI Concierge)

A floating support widget on the customer storefront that reuses the mobile
app's existing **AI Concierge** logic. This documents what is implemented today
and what is intentionally out of scope.

---

## 1. What it is (and is not)

- **It is** an *automated* AI concierge — a pure, local, rule-based responder.
  The UI labels it "Automated assistant" and never implies a live human is
  online. When a question needs a person, it routes the customer to **Contact**
  (`/contact`) / `support@repxl.com`.
- **It is not** human live chat, and there is **no chat backend, database table,
  network call, or message queue**. Responses are generated client-side.

## 2. Reuse of the mobile chat

The mobile Support screen (`react-native/app/support.tsx`) generates replies with
`generateAiResponse()` from `react-native/data/ai-concierge.ts` — a dependency-free,
rule-based function returning `{ text, suggestedFollowUps?, action? }`.

Because that logic is pure and framework-agnostic, the website reuses it via a
**faithful port**, `src/lib/ai-concierge.ts` (same prompts, same branches, same
copy). The web build does not import across the `react-native/` boundary; instead
a parity test (`src/lib/ai-concierge.test.ts`) imports **both** modules and
asserts identical output for a broad query set, so the two can't silently drift.

> If you change the concierge copy/branches, change **both** files (or extract
> them into a shared package). The parity test will fail otherwise.

The concierge's platform-neutral `action.type` is mapped to real storefront
routes by `webActionHref()`:

| action.type | Web route |
|---|---|
| `orders` | `/account/orders` |
| `browse` | `/products` |
| `faq` | `/faq` |
| `contact` | `/contact` |
| `compare` | `/compare` |

Order/account destinations are protected by their own pages/APIs — the widget
only produces a link and never bypasses authentication or ownership checks. The
concierge never fabricates order/tracking/account data; order questions return
guidance that points to the authenticated Orders page.

## 3. Components

| File | Role |
|---|---|
| `src/lib/ai-concierge.ts` | Shared concierge logic (port) + `webActionHref` |
| `src/components/chat/ChatWidget.tsx` | Floating launcher + expandable panel, messages, input, states |
| `src/components/chat/ConditionalChatWidget.tsx` | Route gate (where the widget shows) |
| `src/app/layout.tsx` | Mounts `<ConditionalChatWidget />` once (root layout) |
| `src/app/globals.css` | `chatIn` panel entrance keyframe |

## 4. Where it appears

Mounted once in the root layout and shown on the storefront, **hidden** on:
`/admin/*`, `/login`, `/register`, `/forgot-password`, `/reset-password`,
`/checkout/success`, `/checkout/processing`. It remains available on the checkout
form step so shoppers can ask questions mid-purchase. It uses `z-[60]` and
`env(safe-area-inset-*)` padding so it doesn't obstruct the navbar or sticky UI.

## 5. Conversation behavior & persistence

- Messages send without a page refresh (client-side). **Enter** sends;
  **Shift+Enter** inserts a newline. Empty messages are rejected and duplicate
  submissions are blocked while a reply is pending.
- A short typing indicator precedes each reply; the view auto-scrolls to the
  newest message. An error state with **Retry** re-sends the last user message.
- The conversation is stored in **`sessionStorage`** under `repixl:chat`, so it
  survives storefront navigation and minimize, and clears when the browser tab
  closes. Only non-sensitive support Q&A is stored — no tokens, PII, or order
  data. `localStorage` is intentionally not used.

## 6. Accessibility & responsiveness

- Launcher and close/minimize buttons have ARIA labels; the panel is a labeled
  `role="dialog"` with `aria-modal="false"` (non-trapping overlay); the message
  list is an `aria-live="polite"` region; **Escape** closes and returns focus to
  the launcher; visible `focus-visible` rings throughout; honors
  `prefers-reduced-motion` (global reduced-motion CSS + `motion-reduce:` classes).
- Sizing is viewport-bounded (`min(23rem, 100vw−2rem)` × `min(34rem, 100vh−7rem)`)
  so the panel fits mobile viewports without horizontal overflow, and uses RePXL
  `repixl-*` design tokens (theme-aware).

## 7. Cross-platform conversation continuity — NOT available

There is **no shared conversation history across web and mobile.** Neither
platform persists chat to a backend: the mobile app keeps messages in in-memory
React state (lost on screen unmount), and the website keeps them in per-tab
`sessionStorage`. They share the same *response logic*, not the same
*conversation store*. Implementing cross-device history would require a new
persistence backend (chat model + APIs) and explicit approval — it is out of
scope here and is not implied anywhere in the UI.

## 8. Tests

- `src/lib/ai-concierge.test.ts` — parity with the mobile source, content
  expectations (greeting, human-escalation → Contact, order guidance without
  fabricated data), and `webActionHref` route mapping.
- `src/components/chat/chat-widget.test.ts` — reuse of the shared brain (no
  backend), honest AI identity, Enter/Shift+Enter, empty/duplicate guards,
  typing/error/retry, sessionStorage persistence (not localStorage), a11y
  wiring, responsive/safe placement, single mount, and route gating.

Verified: `tsc --noEmit` clean; `next build` succeeds (68/68 pages); the two chat
test files pass (25 tests). See the checklist for the full-suite snapshot.

## 9. Limitations / possible future work

- Rule-based (keyword) responses, not a generative LLM.
- No cross-device history (see §7).
- No unread/proactive messaging; the launcher shows a one-time attention dot only.
- Not verified in a real browser session here (logic, structure, build verified).
