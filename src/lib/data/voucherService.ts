'use client'

// Voucher data service: API-first with localStorage fallback.
// - validate() is available to customers (POST /api/vouchers/validate).
// - list/create/remove are admin operations (GET/POST/DELETE /api/vouchers).

import { apiClient } from '@/lib/api-client'
import { withFallback, isInfrastructureError } from './fallback'
import {
  apiToClientVoucher,
  clientToApiVoucher,
  type ApiVoucher,
} from '@/lib/mappers'
import type { Voucher } from '@/stores/voucherStore'

const LS_KEY = 'repixl-vouchers'

function readLocal(seed: Voucher[]): Voucher[] {
  try {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) return JSON.parse(stored)
  } catch {
    /* ignore */
  }
  return seed
}

function writeLocal(vouchers: Voucher[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(vouchers))
  } catch {
    /* ignore */
  }
}

function validateLocal(
  vouchers: Voucher[],
  code: string,
  cartTotal: number
): { valid: boolean; discount: number; error?: string } {
  const voucher = vouchers.find((v) => v.code === code.toUpperCase().trim())
  if (!voucher) return { valid: false, discount: 0, error: 'Invalid voucher code.' }
  if (voucher.status !== 'active')
    return { valid: false, discount: 0, error: 'This voucher has expired.' }
  if (voucher.usageLimit > 0 && voucher.used >= voucher.usageLimit)
    return { valid: false, discount: 0, error: 'This voucher has reached its usage limit.' }
  if (cartTotal < voucher.minPurchase)
    return { valid: false, discount: 0, error: `Minimum purchase of $${voucher.minPurchase} required.` }

  let discount =
    voucher.discountType === 'percentage'
      ? Math.round(cartTotal * (voucher.discountValue / 100))
      : voucher.discountValue
  if (voucher.maxDiscount > 0 && discount > voucher.maxDiscount) discount = voucher.maxDiscount
  return { valid: true, discount }
}

export const voucherService = {
  async list(seed: Voucher[]): Promise<Voucher[]> {
    return withFallback<Voucher[]>(
      async () => {
        const res = await apiClient.getPaginated<ApiVoucher>('/api/vouchers?limit=100')
        return (res.data ?? []).map(apiToClientVoucher)
      },
      () => readLocal(seed),
      { mirror: (vouchers) => writeLocal(vouchers) }
    )
  },

  /**
   * Validate a code against a cart total. Tries the API (which also enforces
   * per-user limits server-side), falling back to local validation.
   */
  async validate(
    seed: Voucher[],
    code: string,
    cartTotal: number
  ): Promise<{ valid: boolean; discount: number; error?: string }> {
    try {
      const data = await apiClient.post<{ valid: boolean; discount: number; error?: string }>(
        '/api/vouchers/validate',
        { code, cartTotal }
      )
      return data
    } catch (err) {
      if (!isInfrastructureError(err)) {
        // The API responded with a business error (invalid/expired/etc.) OR the
        // customer isn't logged in (401). Fall back to local validation so the
        // promo field still works for guests and offline mode.
        return validateLocal(readLocal(seed), code, cartTotal)
      }
      return validateLocal(readLocal(seed), code, cartTotal)
    }
  },

  async create(seed: Voucher[], v: Omit<Voucher, 'id' | 'used'>): Promise<Voucher> {
    return withFallback<Voucher>(
      async () => {
        const created = await apiClient.post<ApiVoucher>('/api/vouchers', clientToApiVoucher(v))
        return apiToClientVoucher(created)
      },
      () => {
        const created: Voucher = { ...v, id: `v-${Date.now()}`, used: 0 }
        writeLocal([created, ...readLocal(seed)])
        return created
      }
    )
  },

  async remove(seed: Voucher[], id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete(`/api/vouchers/${id}`)
      },
      () => {
        writeLocal(readLocal(seed).filter((v) => v.id !== id))
      }
    )
  },
}
