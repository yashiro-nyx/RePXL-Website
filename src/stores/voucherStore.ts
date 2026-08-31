'use client'

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
  useVoucher: (code: string) => void
  validateCode: (code: string, cartTotal: number) => Promise<{ valid: boolean; discount: number; error?: string }>
  hydrate: () => Promise<void>
}

const seedVouchers: Voucher[] = [
  { id: '1', code: 'WELCOME10', discountType: 'percentage', discountValue: 10, minPurchase: 50, maxDiscount: 20, usageLimit: 100, perUserLimit: 1, used: 23, validFrom: '2026-01-01', validUntil: '2026-12-31', status: 'active', description: 'Welcome discount for new customers' },
  { id: '2', code: 'SUMMER15', discountType: 'percentage', discountValue: 15, minPurchase: 100, maxDiscount: 30, usageLimit: 50, perUserLimit: 1, used: 12, validFrom: '2026-06-01', validUntil: '2026-08-31', status: 'active', description: 'Summer sale promotion' },
  { id: '3', code: 'FLAT5', discountType: 'fixed', discountValue: 5, minPurchase: 30, maxDiscount: 5, usageLimit: 200, perUserLimit: 3, used: 87, validFrom: '2026-01-01', validUntil: '2026-06-30', status: 'expired', description: 'Flat $5 off any order over $30' },
]

function persist(vouchers: Voucher[]) {
  localStorage.setItem('repixl-vouchers', JSON.stringify(vouchers))
}

export const useVoucherStore = create<VoucherState>((set, get) => ({
  vouchers: seedVouchers,

  addVoucher: async (v) => {
    const created = await voucherService.create(seedVouchers, v)
    set({ vouchers: [created, ...get().vouchers] })
  },

  deleteVoucher: async (id) => {
    set({ vouchers: get().vouchers.filter((v) => v.id !== id) })
    await voucherService.remove(seedVouchers, id)
  },

  useVoucher: (code) => {
    const updated = get().vouchers.map((v) => v.code === code ? { ...v, used: v.used + 1 } : v)
    persist(updated); set({ vouchers: updated })
  },

  validateCode: (code, cartTotal) => voucherService.validate(get().vouchers, code, cartTotal),

  hydrate: async () => {
    try {
      const vouchers = await voucherService.list(seedVouchers)
      if (vouchers.length > 0) set({ vouchers })
    } catch {
      // keep seed
    }
  },
}))
