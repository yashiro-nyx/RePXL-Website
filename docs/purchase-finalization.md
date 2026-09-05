# Payment finalization and inventory

The webhook (`/api/webhooks/paymongo`), authenticated customer verification
(`/api/checkout/verify`), and admin backfill (`/api/admin/backfill-payments`)
use `src/lib/purchase-finalization.ts`.

Inside one PostgreSQL transaction, a conditional update claims only a PENDING,
PROCESSING gateway order. PostgreSQL locks the order and rechecks the predicate
when competing writers finish. Only the winning transaction deducts inventory,
counts the voucher, and removes purchased cart quantities. Each stock update
requires stock >= quantity; failure throws and rolls back every change. Product
locks are acquired in consistent ID order. Paid, failed, refunded, cancelled,
and direct orders cannot be processed again. Notifications/email are attempted
only by the winner after commit; delivery remains best effort (no durable outbox).

Direct `/api/orders` creation uses the same conditional stock deduction in its
creation transaction. Voucher usage now rolls back with a rejected direct order.
It retains its existing PENDING payment status and deducts at creation, rather
than through the gateway finalizer. No Prisma schema changes are required.

## Existing payment lifecycle limitation

Neither gateway checkout entry point reserves inventory. PayMongo confirms a
charge before finalization deducts stock. If stock is insufficient, verification
returns 409, webhook processing returns 500 to permit retry, and the transaction
leaves the order PENDING with inventory/cart/voucher unchanged. No confirmation
is sent. The customer sees an unconfirmed order, not a successful receipt.

A captured charge in this state requires support reconciliation with PayMongo;
this patch does not add automatic refunds or prevent two external charges.
A later retry can finalize if stock becomes available. Preventing capture before
stock allocation requires a separate reservation/expiry or compensation lifecycle.
Cancellation/refund stock-restoration behavior remains unchanged.

## Regression tests

`src/lib/purchase-finalization.test.ts` uses real PostgreSQL transactions and
mocks only authentication, PayMongo, and notification/email boundaries. It skips
unless TEST_DATABASE_URL explicitly identifies a local database named
repixl_concurrency_test. Its fixtures delete users/products/vouchers in that
database; use a disposable database only.

Create an empty local `repixl_concurrency_test` database, then run:

```sh
export TEST_DATABASE_URL='postgresql://postgres:local-test-only@127.0.0.1:55439/repixl_concurrency_test?connection_limit=12'
DATABASE_URL="$TEST_DATABASE_URL" DIRECT_URL="$TEST_DATABASE_URL" node_modules/.bin/prisma db push --skip-generate
npm test
npm run build
```

The test database URL is separate from application DATABASE_URL and DIRECT_URL.
The tests cover duplicate webhooks, concurrent webhook/verification, competing
customers, multi-item rollback, retry after failure, voucher/cart idempotency,
terminal states, hosted checkout, direct purchase concurrency, and normal success.
