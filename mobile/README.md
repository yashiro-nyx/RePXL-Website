# RePXL Mobile

React Native customer app built with Expo.

## Local setup

From the repository root:

```powershell
Set-Location mobile
npm install
```

Set the API URL before starting Expo:

```powershell
$env:EXPO_PUBLIC_API_URL = "http://localhost:3000"
npm run start
```

For push notifications, configure `EXPO_PUBLIC_EXPO_PROJECT_ID` in the mobile environment and set `EXPO_PUSH_ENABLED=true` on the server after the push-token migration has been deployed. Push registration is optional and does not block sign-in.

For an Android emulator, use `http://10.0.2.2:3000`. For a physical device, use the development machine's LAN IP, for example `http://192.168.1.20:3000`.

The current vertical slice supports customer login, MFA verification, secure token persistence, session hydration, logout, product loading, cart and wishlist synchronization, profile and address loading, hosted checkout, order history with delivery status, return requests, and in-app notifications. Checkout opens the existing PayMongo hosted payment page; payment finalization remains server-side through the existing webhook and verification flow. Mobile order refresh is the portable fallback for the website's SSE tracking stream.

It uses these backend routes:

- `POST /api/mobile/auth/login`
- `POST /api/mobile/auth/mfa/verify`
- `POST /api/mobile/auth/refresh`
- `POST /api/mobile/auth/logout`
- `GET /api/mobile/auth/me`
- `GET /api/products`
- `GET /api/cart`
- `POST /api/cart`
- `GET /api/wishlist`
- `POST /api/wishlist`
- `DELETE /api/wishlist/:productId`
- `GET /api/auth/me?scope=customer`
- `PUT /api/auth/me?scope=customer`
- `GET /api/addresses`
- `GET /api/orders`
- `POST /api/checkout/session`
- `GET /api/returns`
- `POST /api/returns`
- `GET /api/reviews?mine=true`
- `POST /api/reviews`
- `GET /api/notifications`
- `PATCH /api/notifications/:id`
- `POST /api/mobile/push-token`
- `DELETE /api/mobile/push-token`

Start the website API in a separate terminal with `npm run dev` from the repository root.