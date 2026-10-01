# RePXL — Security authentication, password verification, and MFA

Updated 2026-10-01. **Normal authentication is separate from sensitive-action
step-up authentication. For password-enabled accounts, Security step-up is the
current RePXL password.** MFA is implemented and covered by automated tests,
but the full live enroll → authenticator → login → disable sequence has not been
completed. The captured `/api/auth/mfa` 503 was a Prisma transaction-expiry bug;
it is repaired in source and covered by tests, but still awaits an authenticated
post-fix live enrollment retest.

## Findings and account classification

The development account identified for this investigation was inspected with a
read-only database query that returned only whether its password field is empty.
The account established a password during this investigation:

- Password: **YES**
- Google: **YES**

The database has no OAuth `Account`/provider-link table. Google login uses a
verified NextAuth identity matched to an existing customer email. “Google: YES”
means that login path is configured and available for the identified account;
it is not a claim that a provider credential or token was read from the database.
No password, hash, OAuth/session token, MFA secret, or account identifier is
recorded here. The only live credential change was the user-authorized Set
Password action: its first request returned 200 and the repeated request returned
the endpoint's intentional 409 because the account already had a password.

### Why the old flow failed

1. `/account/security/mfa` wrapped `MfaSettings` in `SecurityGate`, which checked
   `/api/auth/recent-auth` before displaying the page.
2. Password/email/TOTP/Google verification could issue `RecentAuthRecord` plus
   a signed `repixl-recent-auth` cookie for a 12-minute window.
3. `MfaSettings.act()` posted directly to `/api/auth/mfa`. The API required that
   recent-auth state for `begin`, `disable`, and `regenerate`.
4. **A second, conflicting guard remained in `manageMfa()`**: password accounts
   had to submit their password again; passwordless accounts needed the app
   session's `primaryAt` within **five minutes**, regardless of the recent-auth
   record. Passing the Security gate did not satisfy this guard.
5. `src/lib/mfa/service.ts`'s `denied()` emitted **“Authentication could not be
   verified.”** The MFA login verification route also used that phrase for an
   invalid request body. Both executable messages now give actionable,
   customer-safe guidance. The old Google-only branch of
   `src/components/account/MfaSettings.tsx` emitted **“For changes, sign in with
   Google within the last five minutes.”** and used `/login?oauth=login`.
6. That normal-login landing page can redirect an already logged-in customer to
   `/account`; it does not establish password step-up or necessarily refresh the
   app session's primary timestamp. Refreshing NextAuth evidence in the outer
   gate therefore did not fix the second guard.

The original failed request's session timestamp was not captured. The account's
earlier passwordless state and its later password-enabled state are confirmed;
the precise age of the screenshot's session is not asserted. The encryption key
is currently configured and structurally valid; it was not changed during this
task.

### Captured 503 and source fix

The exact sanitized server exception was Prisma `P2028`: the interactive
transaction was already closed when `manageMfa('begin')` attempted the encrypted
pending-secret `customerMfa.update`. The request had already completed its
authenticated-user lookup, customer row lock, MFA settings lookup, recent-auth
check, attempt update, TOTP-secret generation and encryption. Development API
timings were commonly 4–10 seconds, exceeding Prisma 5.22's five-second default
interactive-transaction timeout. This was not a missing table, `P1001`, invalid
encryption key, TOTP/QR failure, or malformed stored secret.

`src/lib/mfa/service.ts` now passes `{ maxWait: 10_000, timeout: 30_000 }` to
every serialized MFA interactive transaction: primary login, challenge
completion, management, and TOTP step-up. The window is explicit and bounded;
row locks, attempt budgets, session/version checks, password-scoped recent auth,
AES-256-GCM storage, and TOTP/recovery anti-replay checks are unchanged. Unknown
server details remain in server logs while the API returns the existing approved
customer-safe 503 message.

Database connectivity at the captured failure was **available but slow**: reads
and writes succeeded before P2028 closed the active transaction. A later
standalone read-only recheck encountered `PrismaClientInitializationError`, so
current reachability can still vary independently of the source repair. The
required encryption configuration was inspected without printing it and is
**PRESENT / VALID**. Existing MFA, challenge, and recent-auth tables are present;
no schema, migration, database URL, credential, or secret was changed.

### Local port and production origin audit

The later recent-auth 403 had a separate cause. Local RePXL was opened at
`http://localhost:3001`, while local `NEXTAUTH_URL` names
`http://localhost:3000`. The old `sameOrigin()` compared every security POST's
`Origin` only with `NEXTAUTH_URL`, so the legitimate port-3001 password POST was
rejected before `getCurrentUser()` or bcrypt ran. Cookie scope was not the
cause: RePXL cookies are host-only and therefore shared by localhost ports.

Actual cookie-free handler probes isolated the guard:

| Request | Before fix | After fix |
|---|---:|---:|
| GET on localhost:3000/3001 | 401 without a session | 401 without a session |
| POST to 3001, Origin 3001 | 403 | 401 without a session, proving origin passed |
| POST to 3001, Origin 3000 | passed origin, then 401 | 403, because cross-port requests are rejected |

For authenticated users, GET has the intended semantics: valid recent auth is
`200 { verified: true }`; missing or expired recent auth is
`200 { verified: false }`; no customer session is 401. Automated route tests
cover all four states. The Verify button posts the current password to
`/api/auth/recent-auth`; `/api/auth/set-password` is not part of this flow.

`sameOrigin()` now requires a parseable Origin, a matching request origin, and
a non-cross-site Fetch Metadata value. Development allows only the explicit
`http://localhost:3000` and `http://localhost:3001` origins. Production allows
only the canonical origin parsed from `NEXTAUTH_URL`. There are no wildcards,
no disabled CSRF checks, no Better Auth/baseURL/trustedOrigins configuration,
and no auth middleware/proxy. A malformed production URL fails closed with 403
instead of throwing. The recent-auth route no longer returns raw `Forbidden` to
the customer.

Configuration roles and observed status:

| Variable/config | Role | Status |
|---|---|---|
| `NEXTAUTH_URL` | Canonical NextAuth and production security origin | Local value is localhost:3000. Vercel variable exists, but logs prove its production value lacks the required scheme. |
| `NEXT_PUBLIC_SITE_URL` | Public links, email links, and payment redirects; not the recent-auth CSRF authority | Present locally and in Vercel. Local value is the production site URL and has a trailing slash; it did not cause this 403. |
| `NEXTAUTH_SECRET` | Signs NextAuth and RePXL session/recent-auth claims | Present locally and in Vercel; value not inspected or printed. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth provider | Present locally and in Vercel; values not inspected or printed. |
| `MFA_ENCRYPTION_KEY` | AES-256-GCM protection for TOTP secrets | Present locally and in Vercel; local structure is valid; value not printed. |

The public NextAuth provider metadata generates
`https://repxlph.vercel.app/api/auth/callback/google`, matching repository
documentation. The Google Cloud Console authorized-redirect list was not
available for inspection, so provider-side production callback registration is
not claimed verified.

Session cookies have no Domain attribute, are HttpOnly, use `SameSite=Lax`, and
become Secure in production. Recent-auth and MFA-challenge cookies are also
host-only/HttpOnly, use `SameSite=Strict`, and become Secure in production.
These protections were not relaxed. Running the full app on port 3001 still
requires a port-3001 `NEXTAUTH_URL` and corresponding Google callback when
testing Google OAuth itself; password step-up now works on either documented
development port without changing `.env`.

Production is currently blocked for security POSTs until Vercel
`NEXTAUTH_URL` is changed from a bare hostname to the canonical absolute HTTPS
origin and a deployment containing this source fix is published. Vercel logs
show the current deployment throws `ERR_INVALID_URL` from `sameOrigin()` for
POST `/api/auth/recent-auth`; GET without a session correctly returns 401. No
Vercel variable or production credential was changed during this audit.

## Current execution path

| Stage | Source and behavior |
|---|---|
| Security overview | `SecurityOverview.tsx`; view-only status and links. Connected Google status is separate from available step-up methods. |
| MFA page | `src/app/(storefront)/account/security/mfa/page.tsx`; status is viewable without the old page-wide gate. |
| Set up authenticator | `MfaSettings.requestAction('begin')`; displays “VERIFY YOUR IDENTITY” and current-password field for password accounts. |
| Password verification | `POST /api/auth/recent-auth`, `method: 'password'`; session user, same-origin check, real bcrypt comparison, persistent attempt budget. No Google request. |
| Recent verification | `setRecentAuthCookie(userId, 'password')`; existing database record plus signed, HttpOnly cookie. |
| MFA API guard | `POST /api/auth/mfa`; `begin`/`disable`/`regenerate` require a password credential and `requireRecentAuth(userId, 'password')`. |
| Locked service guard | `manageMfa()` checks the same verification against the database under its customer row lock and checks session/MFA version. No password comparison or Google timestamp guard here. |
| Pending secret | `generateSecret()` → AES-256-GCM `encryptSecret()` → `CustomerMfa.secret`; five-minute `pendingExpiresAt`; `enabledAt` remains null. |
| QR | Server-local `qrcode.toDataURL()` over the `otpauth` URI; no external QR service. QR/manual key returned only during provisioning. |
| Confirmation | `confirm` verifies a six-digit TOTP, expiry and replay counter, then enables MFA, increments session version and issues recovery codes. |
| Primary login | Password and normal Google login use `customerLoginResponse()` → `primaryLogin()`; enabled MFA produces a short-lived challenge, not a completed customer session. |
| MFA login challenge | `/login/mfa` → `/api/auth/mfa/verify` → `completeChallenge()`; valid TOTP/unused recovery code consumes the challenge and issues the customer session. |
| Disable/regenerate | Fresh password verification plus TOTP/unused recovery code; version changes invalidate old sessions and previous step-up. |

`cancel` only clears pending enrollment. `acknowledge` requires enabled MFA and
explicit recovery-code acknowledgement. `confirm` is protected by the pending
secret, five-minute expiry, current session version and TOTP; it does not repeat
the password prompt. All mutations retain the MFA attempt budget, row locking,
CSRF/session checks and TOTP/recovery anti-replay protections.

## Authoritative recent verification

`src/lib/auth-helpers.ts` signs these claims: user ID, verification method,
issue time, and SHA-256 digest of the exact customer-session cookie. Verification
checks the signature, user, required method, matching session, non-future issue
time, 12-minute maximum lifetime, matching database `verifiedAt`, and database
`expiresAt`. An old method-less cookie is rejected and the customer verifies
again. This requires no migration.

- Password accounts cannot obtain Security step-up using Google, email or TOTP
  at the recent-auth endpoint; the UI exposes password only.
- Password failure counts are updated under a customer row lock. Five failures
  lock verification for ten minutes. Database failure does not grant access.
- MFA does not trust a client `verified` flag, a password sent to the MFA API, a
  recent normal login, or a Google provider timestamp.
- MFA session-version changes replace the customer session, invalidating its
  earlier session-bound verification. Disabling after enrollment/login requires
  new password verification, plus the second factor.
- Existing generic mobile bearer behavior is retained for unrelated consumers;
  it does **not** satisfy method-scoped MFA or the `ownership` Set Password guard.

## Passwordless accounts and Set Password

Passwordless accounts see **“Set a RePXL password before changing two-factor
authentication”** and a **Set Password** link to `/account/security/password`.
They are not asked for a nonexistent current password.

The existing `SecurityGate` defaults to email ownership verification for these
accounts. `POST /api/auth/set-password` requires a session-bound recent ownership
proof, same-origin request, password-policy validation and matching confirmation.
The conditional update only changes a still-empty password field, preventing a
concurrent request from overwriting a password already set. Success clears the
ownership cookie; MFA then requires verification of the newly created password.
The Password panel disables submission while Set Password is pending so one user
action cannot enqueue the observed duplicate request. Normal Google login remains
available.

Passwordless TOTP and Google ownership verification remain available to the
password-management gate. Google ownership requires a matching live NextAuth
email and a non-future, fresh NextAuth authentication time; the app's ordinary
login timestamp is no longer accepted as fallback. These proofs **cannot**
authorize MFA management. The live Google ownership round-trip is unverified;
email verification is the default Set Password path.

### Email ownership-code hardening

`src/lib/step-up.ts` retains a signed HttpOnly cookie containing the code hash,
user/session binding and eight-minute expiry. The existing `RecentAuthRecord`
now tracks issuance, attempts and consumption under a customer row lock:

- `expiresAt = epoch` identifies an unconsumed email challenge; this is never a
  valid recent-auth record.
- Five failed attempts are enforced in the database, so replaying an old signed
  cookie cannot reset the budget.
- A successful challenge is consumed in the transaction before returning;
  replaying its cookie cannot verify again. The route then issues recent auth.
- A one-minute resend cooldown survives deletion of the browser cookie; resend
  does not reset a still-active failed-attempt budget.
- The mailer's `{ ok: false }` result is handled as delivery failure rather than
  falsely displaying “code sent.” Live email delivery was not tested.

Existing profile-sensitive changes use their separate database-backed
`SensitiveChangeChallenge` flow (`src/lib/sensitive-change.ts`,
`/api/account/sensitive`). Those challenge types and authorization-consumption
rules were inspected and remain unchanged.

## Shared six-box OTP

`OtpInput.tsx` and `otp-input-logic.ts` provide numeric entry, auto-advance,
backspace, arrow keys, visible focus, accessible labels/error state, full-code
paste and mobile keyboard/autofill attributes. Full-code paste replaces all six
positions even from a middle box. Empty middle positions are preserved internally
until filled; only a complete six-digit string is submitted.

The MFA setup auto-submit now uses the completed value provided by `onComplete`,
not the previous React state (which could contain only five digits). Management
uses the shared boxes for authenticator codes, with a separate recovery-code
mode. Setup, login, Security email/TOTP verification and profile email OTPs share
the same component. Real mobile OS autofill was not tested.

## Blank login page and missing development chunk

Observed via HTTP: `/login?oauth=login` returned **200**, but referenced
`/_next/static/chunks/app/(auth)/login/page.js`, which returned **404**. The
corresponding generated `.next/static/chunks/app/(auth)/login` directory was
empty while the server route still existed. The stale/incomplete generated output
is confirmed; which prior process removed it is not known.

The form wrapper in `AuthLayout.tsx` initially rendered at `opacity: 0` and relied
on JavaScript to reveal it. On mobile the decorative right panel is hidden, making
this missing-chunk failure look almost blank. The form now starts visible; the
login Suspense fallback has a visible loading message and OAuth bridge failures
have a caught failure path.

The RePXL dev process was stopped, only generated `.next` was removed, and the
server was restarted. `next.config.mjs` now separates development `.next-dev`
from production `.next`; `.gitignore` and TypeScript generated-type includes
cover the development output. **All seven referenced login JavaScript resources
returned 200 after restart**, including the exact previously failed resource.

`/login?oauth=login` is retained because `SocialAuthButtons` and `useOAuthSync`
use it for ordinary Google login and MFA challenge handoff. MFA management no
longer links to it.

## Verification and remaining work

- Focused auth/security/MFA/OTP/OAuth tests: **152 passed, 23 skipped** across
  14 files (13 passed, one fully skipped). Route-through-service coverage uses
  real bcrypt, cookies/signatures, QR, AES and TOTP with persistence/provider
  test doubles and asserts the bounded transaction options.
- Full suite: **1232 passed, 47 skipped, 9 failed**. The nine failures are existing
  mobile AI concierge assertions in `mobile-features.test.ts` (eight) and
  `mobile-all-modules.test.ts` (one); unrelated concierge code was not changed.
- The mobile recent-auth message assertion was updated for the new safe wording;
  its behavior passes. All task-related tests pass.
- `npx tsc --noEmit`: **passed, exit 0**.
- `npm run build`: initial sandbox run failed fetching existing Google Fonts;
  network-enabled final post-review run **passed, exit 0**, with no build warnings.
  The running dev server retained all seven login chunks after this build.
- Browser, 390×844: login page visible; all seven JS chunks return 200. MFA login
  displays six inputs; paste, arrows, middle deletion/backspace, numeric paste,
  keyboard/autofill attributes, typing auto-advance and no horizontal overflow verified.
- Post-fix local render check: `/login` and `/login/mfa` returned 200; login copy
  rendered without technical error text, and `<html data-scroll-behavior="smooth">`
  is present. This is Next.js 15's compatibility marker for the intentional
  global `scroll-behavior: smooth`; it addresses the console warning separately
  from MFA.
- Rendering regressions: `/login?oauth=login` renders its form without hydration
  for loading, unauthenticated and authenticated session states; OTP markup has
  six accessible numeric inputs and error semantics. Vitest JSX transformation
  is configured without changing Next.js JSX settings.
- Read-only live account capability lookup completed. No account password, MFA,
  OAuth configuration, environment variable, schema or migration was changed.
- **Live evidence completed:** Set Password first request 200; duplicate request
  409; current-password recent-auth 200; Google callback 302 followed by session
  requests 200. The 409 did not originate in the MFA page or Verify handler.
- **Not completed after the fix:** live QR response; real authenticator scan and
  valid/invalid confirmation; wrong/correct-code sign-in; disable; deliberate
  provider-hosted Google regression click-through. The existing PostgreSQL suite
  is skipped without its disposable `TEST_MFA_DATABASE_URL`; no test database or
  migration was created. Automated tests are not a claim that live MFA works.

## Files changed in this investigation

Earlier uncommitted work was preserved. This task changed:

- Configuration: `.gitignore`, `next.config.mjs`, `tsconfig.json`, `vitest.config.ts`.
  Next.js also regenerated `next-env.d.ts` for the active build output; its final
  contents match the original tracked file.
- Server: `src/lib/auth-helpers.ts`, `src/lib/step-up.ts`,
  `src/lib/mfa/service.ts`, `src/app/api/auth/recent-auth/route.ts`,
  `src/app/api/auth/mfa/route.ts`, `src/app/api/auth/mfa/verify/route.ts`, and
  `src/app/api/auth/set-password/route.ts`.
- UI: `src/components/account/MfaSettings.tsx`, `SecurityGate.tsx`,
  `SecurityOverview.tsx`, `PasswordPanel.tsx`; `src/components/auth/AuthLayout.tsx`;
  `src/components/ui/OtpInput.tsx`; `src/lib/otp-input-logic.ts`;
  `src/app/(storefront)/account/security/mfa/page.tsx`;
  `src/app/(auth)/login/page.tsx` and `login/mfa/page.tsx`.
- This follow-up also changed `src/app/layout.tsx` to add Next.js 15's
  `data-scroll-behavior="smooth"` compatibility marker while preserving the
  intentional global smooth scrolling, and added an in-flight Set Password guard
  in `PasswordPanel.tsx`.
- Tests: new `src/lib/mfa/password-flow.test.ts` and `src/lib/login-render.test.ts`; updated
  `src/lib/mfa/security.test.ts`, `src/lib/recent-auth-route.test.ts`,
  `src/lib/recent-auth.test.ts`, `src/lib/step-up.test.ts`,
  `src/lib/otp-input-logic.test.ts`, `src/lib/mobile-features.test.ts`.
- Documentation: this file, `README.md`, `docs/Group2_ProjectChecklist.md`,
  `docs/system-architecture.md`, `docs/SETUP.md`, `docs/deployment.md`, and the
  security documentation-map entry in `AGENTS.md`.


Exact focused test command:

```sh
npx vitest run src/lib/auth-lifecycle.test.ts src/lib/auth-email.test.ts src/app/api/auth/oauth/route.test.ts src/lib/mfa/crypto.test.ts src/lib/mfa/security.test.ts src/lib/mfa/password-flow.test.ts src/lib/recent-auth.test.ts src/lib/recent-auth-route.test.ts src/lib/security-consolidation.test.ts src/lib/step-up.test.ts src/lib/otp-input-logic.test.ts src/lib/otp-usage.test.ts src/lib/login-render.test.ts
```

Full-suite command: `npx vitest run` (exit 1 for the nine existing concierge
failures). Focused command exits 0. `git diff --check` passes. No commit or push.
