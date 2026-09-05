'use client'

import { reportActionFailure } from '@/lib/action-error'
import { create } from 'zustand'
import { voucherService } from '@/lib/data/voucherService'

export interface Voucher {
  id: string
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  minPurchase: number
  maxDiscount: number
  usageLimit: number
  perUserLimit: number
  used: number
  validFrom: string
  validUntil: string
  status: 'active' | 'expired' | 'disabled'
  description: string
}

interface VoucherState {
  vouchers: Voucher[]
  addVoucher: (v: Omit<Voucher, 'id' | 'used'>) => Promise<void>
  deleteVoucher: (id: string) => Promise<void>
  validateCode: (
    code: string,
    cartTotal: number
  ) => Promise<{ valid: boolean; discount: number; error?: string }>
  hydrate: () => Promise<void>
}

const seedVouchers: Voucher[] = []

export const useVoucherStore = create<VoucherState>((set, get) => ({
  vouchers: seedVouchers,

  addVoucher: async (v) => {
    const created = await voucherService.create(seedVouchers, v)
    set({ vouchers: [created, ...get().vouchers] })
  },

  deleteVoucher: async (id) => {
    await voucherService.remove(seedVouchers, id)
    set({ vouchers: get().vouchers.filter((v) => v.id !== id) })
  },

  validateCode: (code, cartTotal) =>
    voucherService.validate(get().vouchers, code, cartTotal),

  hydrate: async () => {
    try {
      set({ vouchers: await voucherService.list([]) })
    } catch {
      set({ vouchers: [] })
      reportActionFailure()
    }
  },
}))
