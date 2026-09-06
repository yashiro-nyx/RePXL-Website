# Sensitive profile hardening continuation

## Verified partial work

Continued the existing working tree, including Kiro's account/email/phone/DOB
routes, SensitiveChangeModal, ProfilePanel, masking helpers, recent-auth gate,
profile schema whitelist, and `/api/auth/me` masked response. The modal's JSX was
valid, but `hasPassword` was missing from the store and profile wiring. The GET
response already masked values, while authService/authStore still expected raw
phone/DOB. PUT omitted hasPassword. Mutation authorization checks and deletions
were separate operations, and email mutation checked only the new-email proof.

## Completed changes

- `src/app/api/auth/me/route.ts`: explicit safe responses for GET/PUT, server
  maskPhone/maskDob, hasPassword in both responses, no redundant birthYear field.
  Preserved the explicit ordinary-profile whitelist: names, username, gender,
  avatarUrl. Email, phone, and dateOfBirth in ordinary updates have no effect.
- `src/lib/data/authService.ts`, `src/stores/authStore.ts`, auth login/register
  pages: maskedPhone, maskedDob, hasPassword replace raw profile phone/DOB.
  The store is not persisted; existing legacy-storage cleanup is retained.
- `src/components/account/ProfilePanel.tsx` and `SensitiveChangeModal.tsx`:
  Google-only email is Managed through Google, no Change button. New phone/DOB
  start empty. The existing OAuth logout preference is used, Zustand is logged
  out, NextAuth signOut is attempted, and the user returns to /login.
- `src/lib/sensitive-change.ts` and `src/app/api/account/{sensitive,email,phone,dob}/route.ts`:
  PostgreSQL customer row locks serialize issuance, verification, failed attempt
  accounting, and mutation. Successful OTP verification sets usedAt once.
  Mutation deletes verified authorizations in the SAME transaction as the write;
  rollback restores them if the write fails. Original expiry and a five-minute
  verified-authorization window both apply. Email requires old AND new verified
  authorizations, bound to user/type/pendingEmail. New-email OTP issuance requires
  the verified old-email authorization. Archived/Google-only restrictions are
  rechecked under the lock. Eight-minute OTP expiry, five attempts and 60-second
  resend cooldown remain enforced. Impossible calendar dates are rejected.
- `src/lib/retired-auth-email.ts`, auth registration/OAuth routes: reject retired
  email identities. Registration and retirement share a PostgreSQL advisory lock
  to prevent a concurrent registration from recreating the retired identity.
- `src/lib/mfa/{service,http}.ts` and password/OAuth login routes: final customer
  session issuance rechecks the previously verified email under the customer lock.
  This closes a lookup-before-email-change/session-after-change race. No TOTP,
  recovery-code, encryption, or attempt-limit behavior was changed. Login payloads
  no longer include raw profile phone.
- Checkout only loses its profile-phone fallback; address-specific phone prefilling
  and API remain unchanged. Admin settings use the shared masked phone and pass
  only ordinary fields to updateProfile; admin authentication is unchanged.

## Email identity and invalidation

Google lookup is email-based. There is no provider Account table or stable Google
provider-account linkage. Google-only users (`password === ''`) cannot change
email through either OTP issuance or mutation. Password users can complete dual
OTP verification. Their new email is saved on the SAME user, with no account copy.

After email changes, the existing customer MFA/session version increments even
for non-MFA customers, invalidating all earlier customer cookies server-side.
MFA challenges, sensitive challenges, and recent-auth records are removed.
Cookies are cleared. Client logout uses the EXISTING `repixl-oauth-logged-out`
flag and attempts NextAuth signOut. Even if client storage or signOut fails, the
old Google identity cannot restore a session or register a duplicate account.

Intentional Google login with the OLD email is blocked. Use the new email and
RePIXL password. There is no claimed automatic provider relinking. A future
stable-provider linkage system would require a separate, verified linking design.

## Additive migration

`20260909000000_retired_auth_emails` adds only `retired_auth_emails`, containing
SHA-256 normalized email hashes and creation timestamps. No database reset or
production migration was run. This migration and Kiro's prior pending migrations
must be deployed before the updated app. No new environment secret is needed.
The retired identity is deliberately unavailable for future registration/email
changes; it is not automatically recycled.

## Payload and browser exposure

Kiro's partial GET already returned maskedPhone/maskedDob plus birthYear, while
client state still expected phone/dateOfBirth. Final GET/PUT return:

```json
{
  "email": "customer@example.test",
  "maskedPhone": "*******4567",
  "maskedDob": "**/**/1990",
  "hasPassword": true
}
```

Other non-sensitive profile fields remain. No `phone`, `dateOfBirth`, password,
or password hash is returned. Stored raw PROFILE phone and DOB do not reach the
browser through profile/auth payloads or Zustand. The user necessarily enters
NEW values in the change flow. Shipping-address phone data remains available
through its separate address APIs and is not treated as profile-display data.

## Verification and limitations

`sensitive-profile.test.ts` covers actual PostgreSQL routes, cookies, dual OTP,
wrong identity/type/pending-email, expiration/attempts, archived-safe helpers,
concurrent verification/mutation, masking and generic-update restrictions.
`sensitive-profile-client.test.ts` checks client hydration strips raw values.
Existing MFA tests now complete the real recent-auth endpoint required by Kiro's
changes. Existing notification/navigation/service test typing errors were fixed
without weakening authentication or changing production notification behavior.

Tests use TEST_PROFILE_DATABASE_URL pointing ONLY to disposable local
`repixl_profile_test`; they delete fixtures and must never target production.
MFA/purchase tests run in separate disposable local databases. No live Google UI
or email delivery was exercised; those external boundaries are mocked. Existing
security email is best effort. No commit or push was performed.
