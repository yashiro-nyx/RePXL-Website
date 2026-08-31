'use client'

// Client helper to start a PayMongo hosted-checkout session.
// Gated by NEXT_PUBLIC_PAYMONGO_ENABLED so the UI knows whether the gateway is
// wired without exposing the secret key.

import { apiClient } from '@/lib/api-client'
import type { Order } from '@/stores/orderHistoryStore'

export function isPaymongoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMONGO_ENABLED === 'true'
}

interface CheckoutSessionResponse {
  checkoutUrl: string
  orderNumber: string
  sessionId: string
}

/**
 * Create a PayMongo checkout session for the current cart and return the URL to
 * redirect the customer to. Throws if the API/gateway isn't available (the
 * caller should fall back to the direct-order flow).
 */
export async function startPaymongoCheckout(input: {
  fullName: string
  address: string
  barangay?: string
  city: string
  province?: string
  postalCode: string
  courierName: string
  courierEstimate: string
  paymentMethod: string
  voucherCode?: string | null
  shippingCost: number
}): Promise<CheckoutSessionResponse> {
  return apiClient.post<CheckoutSessionResponse>('/api/checkout/session', input)
}

export type { Order }
