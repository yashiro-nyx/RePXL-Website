# Shipping webhook authentication

Configure a dedicated random `SHIPPING_WEBHOOK_SECRET` in the server environment
and in the trusted shipping sender. Generate it with `openssl rand -hex 32`.
Do not use a `NEXT_PUBLIC_` variable or put this credential in browser code.

Send `POST /api/webhooks/shipping` over HTTPS with:

- `Authorization: Bearer <SHIPPING_WEBHOOK_SECRET>`
- `Content-Type: application/json`

The JSON payload is unchanged:

```json
{"tracking_number":"TRACKING_NUMBER","status_code":"IT","status_description":"In transit"}
```

Supported status codes are `IT`, `OD`, and `DE`. Missing or incorrect authorization
returns 401 before any database update. An unconfigured server returns 503;
there is no development bypass. This is shared-secret authentication, not a
carrier-specific signature protocol; the trusted sender must support the header.

The admin simulation endpoint requires a valid admin session and attaches this
header server-side automatically. It uses the configured site URL and rejects
redirects so the credential cannot be forwarded to a redirected destination.
The existing direct admin tracking-update endpoint does not require this secret.

Checkout and order diagnostics require an admin session and expose only aggregate
counts. Tracking SSE requires an authenticated order owner or admin, rechecks
session authorization and ownership during polling, and emits only delivery
status, progress, and description.
