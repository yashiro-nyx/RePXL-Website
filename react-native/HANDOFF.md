# RePXL Mobile — Developer Handoff

This document covers everything a developer needs to wire the mobile app to the existing backend and ship it.

---

## 1. Architecture Overview

The app is fully client-side. State lives in React Context (`context/AppContext.tsx`). All mock data is in `data/products.ts`. There is no backend code in this folder — integration points are clearly marked below.

---

## 2. Integration Points

### 2.1 Product Catalog

**File:** `data/products.ts`

Replace the `PRODUCTS` array with a fetch from your database:

```ts
// Before (mock)
export const PRODUCTS: Product[] = [ ... ];

// After (example REST fetch)
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch('https://your-api.com/products');
  return res.json();
}
```

Then in `context/AppContext.tsx`, load products into state on mount:

```ts
const [products, setProducts] = useState<Product[]>([]);

useEffect(() => {
  fetchProducts().then(setProducts);
}, []);
```

Pass `products` down through context or import the fetch wherever needed.

### 2.2 Authentication

**File:** `context/AppContext.tsx` — `login` and `logout` functions

```ts
// Current (mock — replace with your auth call)
const login = (u: User) => setUser(u);
const logout = () => setUser(null);
```

Replace with your auth provider (JWT, session cookie via secure storage, OAuth, etc.):

```ts
import * as SecureStore from 'expo-secure-store';

const login = async (email: string, password: string) => {
  const res = await fetch('https://your-api.com/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'Content-Type': 'application/json' },
  });
  const { user, token } = await res.json();
  await SecureStore.setItemAsync('token', token);
  setUser(user);
};

const logout = async () => {
  await SecureStore.deleteItemAsync('token');
  setUser(null);
};
```

Install secure storage: `npx expo install expo-secure-store`

### 2.3 Cart Persistence

**File:** `context/AppContext.tsx`

Cart is currently in-memory. To persist across sessions, sync cart state to your backend after each mutation:

```ts
const addToCart = async (product: Product) => {
  // update local state first (optimistic)
  setCart((prev) => { ... });
  // then sync
  await fetch('https://your-api.com/cart', {
    method: 'POST',
    body: JSON.stringify({ productId: product.id, quantity: 1 }),
    headers: { Authorization: `Bearer ${token}` },
  });
};
```

### 2.4 Orders / Checkout

**File:** `app/checkout.tsx` — the "Place Order" button (`onPress` at the bottom)

```ts
// Replace router.replace('/order-confirm') with:
const res = await fetch('https://your-api.com/orders', {
  method: 'POST',
  body: JSON.stringify({ cart, shippingForm, paymentMethod }),
  headers: { Authorization: `Bearer ${token}` },
});
const order = await res.json();
router.replace({ pathname: '/order-confirm', params: { orderId: order.id } });
```

### 2.5 Wishlist

**File:** `context/AppContext.tsx` — `toggleWishlist`

Currently an array of product IDs in memory. Mirror adds/removes to your backend the same way as cart.

---

## 3. TypeScript Interfaces

All shared types are in `types/index.ts`. Match your API response shapes to these interfaces — or update the interfaces to match your schema. Key ones:

| Interface | Used in |
|-----------|---------|
| `Product` | everywhere |
| `CartItem` | cart, checkout, order-confirm |
| `User` | auth, account screen |
| `Specs` | product detail, compare |
| `Review` | product detail |

---

## 4. Screens Quick Reference

| Screen | File | Key integration |
|--------|------|----------------|
| Home | `app/(tabs)/home.tsx` | Product list fetch |
| Search | `app/(tabs)/search.tsx` | Product list fetch + filter |
| Product Detail | `app/product.tsx` | Single product fetch by ID |
| Cart | `app/(tabs)/cart.tsx` | Cart state from context |
| Checkout | `app/checkout.tsx` | POST order to backend |
| Order Confirm | `app/order-confirm.tsx` | Display order ID from params |
| Account | `app/(tabs)/account.tsx` | User from context, orders fetch |
| Compare | `app/compare.tsx` | compareList from context |

---

## 5. Navigation

Uses **Expo Router** (file-based, similar to Next.js). Routes map 1:1 to files under `app/`. To navigate with params:

```ts
router.push({ pathname: '/product', params: { id: '2' } });

// Receive in product.tsx:
const { id } = useLocalSearchParams<{ id: string }>();
```

---

## 6. Environment Variables

Expo uses `app.config.js` (or `app.json`) for environment config. To add your API base URL:

1. Rename `app.json` → `app.config.js`
2. Add:
```js
export default {
  ...existingConfig,
  extra: {
    apiUrl: process.env.API_URL ?? 'https://your-api.com',
  },
};
```
3. Access anywhere:
```ts
import Constants from 'expo-constants';
const API_URL = Constants.expoConfig.extra.apiUrl;
```

Install: `npx expo install expo-constants`

---

## 7. Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli
eas login

# Configure (first time)
eas build:configure

# Build
eas build --platform android   # APK / AAB
eas build --platform ios       # IPA (requires Apple Developer account)

# Submit to stores
eas submit --platform android
eas submit --platform ios
```

---

## 8. Web App Parity

The companion web app (`src/` in the parent repo) shares the same product schema and screen structure. When updating types or data shape, update both:

- `react-native/types/index.ts`
- `src/types.ts` (web)
