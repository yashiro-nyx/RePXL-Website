import { createHash, timingSafeEqual } from 'crypto'

// Server-only credential. Never expose it in NEXT_PUBLIC_* variables or responses.
export function shippingAuthorizationHeader(): string | null {
  const secret = process.env.SHIPPING_WEBHOOK_SECRET
  return secret?.trim() ? `Bearer ${secret}` : null
}

export function verifyShippingAuthorization(header: string | null): 'valid' | 'invalid' | 'unconfigured' {
  const expected = shippingAuthorizationHeader()
  if (!expected) return 'unconfigured'
  if (!header) return 'invalid'
  // Fixed-size digests allow constant-time comparison regardless of input length.
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(header), digest(expected)) ? 'valid' : 'invalid'
}
