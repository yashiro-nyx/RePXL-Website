# Mobile Integration Handoff

The sole maintained native project is `react-native/`. The deprecated `mobile/`
prototype directory has been permanently removed from the repository.

### Core Architecture & Services

The native client encapsulates its secure session and server communications in:

- `src/services/session.ts`: Manages access and refresh tokens via Expo SecureStore. Access tokens last 15 minutes; refresh tokens last 30 days and rotate on use. Serializes refresh requests so concurrent queries do not race.
- `src/services/api.ts`: Typed REST client providing shared bearer access to:
  - Auth: `login`, `register`, `verifyMfa`, `me`, `logout`, `refresh`
  - Products: `getProducts`, `getProduct`
  - Cart: `getCart`, `addToCart`, `updateCartItem`, `removeCartItem`, `clearCart`
  - Addresses: `getAddresses`, `createAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`
  - Vouchers: `validateVoucher`
  - Checkout: `checkout` (accepts selected items, address, voucherCode, shippingCost)
  - Wishlist: `getWishlist`, `addToWishlist`, `removeFromWishlist`
  - Orders: `getOrders`, `getOrder`
  - Reviews: `getReviews`, `createReview`, `deleteReview`
  - Notifications: `getNotifications`, `markNotificationRead`
  - Push Tokens: `registerPushToken`, `unregisterPushToken`
- `src/services/push.ts`: Device push-token registration with backend sync.
- `context/AppContext.tsx`: Unified React Context managing session hydration, cart items, selected cart items, wishlist items, address mutations, reviews, in-app notifications, and theme tokens.

### Key Native Screen Capabilities

1. **Cart & Selective Checkout (`app/(tabs)/cart.tsx` & `app/checkout.tsx`)**:
   - Checkbox-based selective checkout ("Select All" and individual toggles).
   - Live voucher validation (`/api/vouchers/validate`) with real-time discount calculations.
   - Clear Cart confirmation modal.
   - Inline Philippine address creation modal in checkout with region, province, city, barangay, and postal code.
2. **Account & Wishlist (`app/(tabs)/account.tsx`)**:
   - Full in-app Address Management modal with CRUD and default address setting.
   - Dedicated Wishlist sub-view with direct "Add to Cart" and "Remove" actions.
   - Logout confirmation modal.
3. **Product Detail & Discovery (`app/product.tsx`, `home.tsx`, `search.tsx`, `compare.tsx`)**:
   - Brand CCD color simulation ("Try the Look" modal with presets for Canon, Kodak, Sony, Nikon, Fujifilm, Panasonic via `data/colorProfiles.ts`).
   - Condition Grading guide modal.
   - In-app "Write a Review" modal with star rating picker and review deletion.
   - Camera comparison tool with interactive camera picker modal.
   - Full-text search with URL parameter synchronization, "In Stock Only" toggle, and price bracket filters.
4. **Order Tracking (`app/order.tsx`)**:
   - Visual multi-step tracking status timeline (Placed → Confirmed → Shipped → Delivered) with live status refresh.

### Build & Workspace Isolation

The root `tsconfig.json` includes only Next.js/server sources and explicitly
excludes native projects and generated artifacts. `.vercelignore` keeps both
the retired folder name and the maintained native project out of the Vercel
upload.

No client state is an order, cart, wishlist, inventory, review, address, or
notification source of truth. A failed API mutation remains a failure.
