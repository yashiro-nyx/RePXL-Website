# RePXL Mobile

React Native / Expo app for the RePXL vintage digital camera marketplace (Philippine market).

## Stack

- **Expo** (managed workflow) with **Expo Router** for file-based navigation
- **React Native 0.74** + **React 18**
- **TypeScript**
- **@expo/vector-icons** (Feather set)
- **expo-linear-gradient** for background gradients
- **react-native-safe-area-context** for device insets
- **@expo-google-fonts/inter** for typography

## Project Structure

```
app/
  _layout.tsx          — Root layout: fonts, providers, Stack navigator
  index.tsx            — Splash screen
  (tabs)/
    _layout.tsx        — Tab bar (Home / Search / Cart / Account)
    home.tsx           — Product grid + category filter
    search.tsx         — Search with brand/condition/sort filters
    cart.tsx           — Cart with qty stepper and order summary
    account.tsx        — Account: profile, purchases, nav sections
  product.tsx          — Product detail: specs, accordions, reviews
  compare.tsx          — Side-by-side spec comparison (max 3)
  login.tsx
  signup.tsx
  checkout.tsx         — 2-step: shipping → payment
  order-confirm.tsx

context/
  AppContext.tsx        — Global state: cart, user, wishlist, compareList

data/
  products.ts          — Static product catalog (replace with DB calls)

types/
  index.ts             — Shared TypeScript interfaces
```

## Getting Started

```bash
cd react-native
npm install
npx expo start
```

Scan the QR code with **Expo Go** (iOS / Android) or press `i` / `a` for simulator.

## Connecting to Your Database

All data-fetching is isolated in `data/products.ts` and `context/AppContext.tsx`.

- Replace the `PRODUCTS` array in `data/products.ts` with your API / DB calls
- Replace the `login` / `logout` functions in `context/AppContext.tsx` with your auth layer
- Cart, wishlist, and order persistence can be added directly in `AppContext.tsx`

See `HANDOFF.md` for a full integration guide.
