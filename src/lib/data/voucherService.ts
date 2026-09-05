'use client'

// - validate() is available to customers (POST /api/vouchers/validate).
// - list/create/remove are admin operations (GET/POST/DELETE /api/vouchers).

import { apiClient } from '@/lib/api-client'
import {
  apiToClientVoucher,
  clientToApiVoucher,
  type ApiVoucher,
} from '@/lib/mappers'
import type { Voucher } from '@/stores/voucherStore'

export const voucherService = {
  async list(seed: Voucher[]): Promise<Voucher[]> {
    const res = await apiClient.getPaginated<ApiVoucher>(
      '/api/vouchers?limit=100'
    )
    return (res.data ?? []).map(apiToClientVoucher)
  },

  /**
   * Validate with the server, including per-user limits. Reject on failure.
   */
  async validate(
    seed: Voucher[],
    code: string,
    cartTotal: number
  ): Promise<{ valid: boolean; discount: number; error?: string }> {
    return apiClient.post('/api/vouchers/validate', { code, cartTotal })
  },

  async create(
    seed: Voucher[],
    v: Omit<Voucher, 'id' | 'used'>
  ): Promise<Voucher> {
    const created = await apiClient.post<ApiVoucher>(
      '/api/vouchers',
      clientToApiVoucher(v)
    )
    return apiToClientVoucher(created)
  },

  async remove(seed: Voucher[], id: string): Promise<void> {
    await apiClient.delete(`/api/vouchers/${id}`)
  },
}
