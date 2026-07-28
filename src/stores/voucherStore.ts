'use client'

import { create } from 'zustand'

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
  addVoucher: (v: Omit<Voucher, 'id' | 'used'>) => void
  deleteVoucher: (id: string) => void
  useVoucher: (code: string) => void
  validateCode: (code: string, cartTotal: number) => { valid: boolean; discount: number; error?: string }
  hydrate: () => void
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

  addVoucher: (v) => {
    const updated = [{ ...v, id: `v-${Date.now()}`, used: 0 }, ...get().vouchers]
    persist(updated); set({ vouchers: updated })
  },

  deleteVoucher: (id) => {
    const updated = get().vouchers.filter((v) => v.id !== id)
    persist(updated); set({ vouchers: updated })
  },

  useVoucher: (code) => {
    const updated = get().vouchers.map((v) => v.code === code ? { ...v, used: v.used + 1 } : v)
    persist(updated); set({ vouchers: updated })
  },

  validateCode: (code, cartTotal) => {
    const voucher = get().vouchers.find((v) => v.code === code.toUpperCase().trim())
    if (!voucher) return { valid: false, discount: 0, error: 'Invalid voucher code.' }
    if (voucher.status !== 'active') return { valid: false, discount: 0, error: 'This voucher has expired.' }
    if (voucher.used >= voucher.usageLimit) return { valid: false, discount: 0, error: 'This voucher has reached its usage limit.' }
    if (cartTotal < voucher.minPurchase) return { valid: false, discount: 0, error: `Minimum purchase of $${voucher.minPurchase} required.` }

    let discount = 0
    if (voucher.discountType === 'percentage') {
      discount = Math.round(cartTotal * (voucher.discountValue / 100))
      if (discount > voucher.maxDiscount) discount = voucher.maxDiscount
    } else {
      discount = voucher.discountValue
    }

    return { valid: true, discount }
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-vouchers')
      if (stored) { set({ vouchers: JSON.parse(stored) }) }
    } catch {}
  },
}))
