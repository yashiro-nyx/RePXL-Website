# Mobile Integration Handoff

The maintained native project is `react-native/`. The removed `mobile/`
prototype supplied the first bearer-auth API client; its secure session and API
concepts now live in:

- `src/services/session.ts`
- `src/services/api.ts`
- `src/services/push.ts`
- `context/AppContext.tsx`

The native client reuses:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/mfa/verify`
- `POST /api/mobile/auth/refresh`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `GET /api/products` and `GET /api/products/[slug]`
- cart, wishlist, profile, address, order, review, and notification routes
- `POST /api/checkout/session`
- `POST /api/mobile/push-token`

The access token lasts 15 minutes. The refresh token lasts 30 days and rotates
on use. The client serializes refresh attempts so concurrent API requests do
not race while rotating a token.

The root `tsconfig.json` includes only Next.js/server sources and explicitly
excludes native projects and generated artifacts. `.vercelignore` keeps both
the retired folder name and the maintained native project out of the Vercel
upload.

No client state is an order, cart, wishlist, inventory, review, address, or
notification source of truth. A failed API mutation remains a failure.
