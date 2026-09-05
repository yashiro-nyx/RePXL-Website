# Browser storage and server authority

Authentication and account records require a successful authenticated API response.
Network errors, HTTP 5xx, and API rejections must never create a local account,
order, address, review, voucher, inventory change, or administrative action.

Passwords and session profiles are no longer mirrored to localStorage. The server
continues to own the HTTP-only authentication cookies. Google sign-in still uses
the verified NextAuth bridge. Account state is cleared on failed hydration, and
account switches clear private in-memory records and invalidate late responses.

Orders are confirmed only after the server returns the created order. A failed
payment initialization stops checkout; it does not switch to direct checkout.
Direct checkout remains available only when PayMongo is explicitly disabled.
If a response is lost, customers are told to check order history before retrying.
No automatic retries or locally generated order confirmations are used.

The permitted localStorage state is limited to:

- Theme and camera comparison selections.
- Guest cart product slugs/quantities and guest wishlist slugs.
- An explicit logout preference, which cannot authenticate anyone.

Checkout item selection remains in sessionStorage. Authenticated carts and
wishlists use only the server; guest state is never substituted when their API
fails or automatically merged into an account.

On application initialization, legacy account storage is deleted without parsing
its contents, including passwords, session markers, addresses, orders, reviews,
saved-card metadata, birth dates, and per-account cart/wishlist copies.

Saved-card and birth-date controls are unavailable because the application has
no server-backed persistence for them. Payment details can still be entered at
checkout. No database schema changes are required by this cleanup.
