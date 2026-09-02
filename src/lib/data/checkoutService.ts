'use client'

// Client helpers for PayMongo payment flows.
// Gated by NEXT_PUBLIC_PAYMONGO_ENABLED so the UI knows whether the gateway
// is wired without exposing the secret key.

import { apiClient } from '@/lib/api-client'
import type { Order } from '@/stores/orderHistoryStore'

export function isPaymongoEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PAYMONGO_ENABLED === 'true'
}

// ─── Hosted checkout (legacy / fallback) ───────────────────────────────────────

interface CheckoutSessionResponse {
  checkoutUrl: string
  orderNumber: string
  sessionId: string
}

/**
 * Create a PayMongo hosted checkout session and return the redirect URL.
 * Kept for fallback — prefer startPaymentIntent for the embedded PIPM flow.
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

// ─── Embedded PIPM flow ─────────────────────────────────────────────────────────

interface PaymentIntentResponse {
  clientKey: string
  intentId: string
  orderNumber: string
  total: number
}

/**
 * Create a PayMongo Payment Intent (server-side) and return the client_key +
 * intentId so the frontend can tokenize card/wallet details and attach them
 * directly to PayMongo without the secret key leaving the server.
 */
export async function startPaymentIntent(input: {
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
}): Promise<PaymentIntentResponse> {
  return apiClient.post<PaymentIntentResponse>('/api/checkout/payment-intent', input)
}

export type { Order }
