'use client'

import { create } from 'zustand'
import type { Product } from '@/types'

export interface Order {
  orderNumber: string
  date: string
  items: Product[]
  subtotal: number
  shippingCost: number
  total: number
  courierName: string
  courierEstimate: string
  paymentMethod: string
  fullName: string
  address: string
  city: string
  postalCode: string
  status: 'Processing' | 'Shipped' | 'Delivered'
}

interface OrderHistoryState {
  orders: Order[]
  addOrder: (order: Order) => void
  hydrate: () => void
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
  orders: [],

  addOrder: (order) => {
    const updated = [order, ...get().orders]
    localStorage.setItem('repixl-orders', JSON.stringify(updated))
    set({ orders: updated })
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-orders')
      if (stored) {
        const orders: Order[] = JSON.parse(stored)
        set({ orders })
      }
    } catch {
      // ignore
    }
  },
}))
