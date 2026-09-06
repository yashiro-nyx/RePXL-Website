# Customer account navigation

`/account` redirects to `/account/orders`. A shared account layout provides
persistent desktop navigation and a stacked mobile layout. Logout is separate
from navigation. The customer dashboard and its widgets have been removed.

Routes:

- `/account/profile`: existing editable profile fields and server persistence.
- `/account/addresses`: existing address form and store/API behavior.
- `/account/security`: compact password and MFA settings.
- `/account/security/password`: existing change/set-password controls.
- `/account/security/mfa`: existing MFA component, with no security/backend changes.
- `/account/orders`: existing order history with All, Processing, Shipped,
  Delivered, Completed, and Cancelled filters.
- `/account/orders/[orderNumber]` and its `/return` child: existing details,
  tracking, printing, cancellation, reviews, and return/refund functionality.
- `/account/reviews`: existing customer review list, search, and photo viewer.
- `/account/notifications`: existing notification center.

The order store exposes fulfillment statuses, not payment or return-request
states. Processing can include pending payments, and Delivered is distinct from
Completed (customer receipt confirmation). Filters therefore use the actual
status labels, with no invented To Pay or Return/Refund states. Returns remain
available through existing order details. The existing order history service's
100-record limit and active-order scope are unchanged.

Removed from the former monolithic account page: DashboardTab, its summary
fetches/cards/quick links, the duplicate OrdersTab, PaymentsTab placeholder,
tab-switching navigation, and unused dashboard imports. Review summary cards
were also removed in favor of the review list. Existing order/notification
pages shed duplicate outer containers/footers and use the shared layout.
The receipt component and print behavior remain intact; navigation is no-print.

Implementation files: `src/components/account/{AccountShell,ProfilePanel,
AddressesPanel,PasswordPanel,ReviewsPanel,SecurityOverview}.tsx`, the account
route files above, `src/lib/account-navigation.ts`, and its regression tests.
MfaSettings and all authentication/payment/inventory/shipping APIs are unchanged
by this account refactor. Earlier MFA changes in the workspace are preserved.
