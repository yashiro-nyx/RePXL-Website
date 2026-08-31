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
  barangay: string
  city: string
  province: string
  postalCode: string
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled'
  userEmail?: string
}

interface OrderHistoryState {
  orders: Order[]
  archivedOrders: Order[]
  addOrder: (order: Order) => void
  updateStatus: (orderNumber: string, status: Order['status']) => void
  archiveOrder: (orderNumber: string) => void
  restoreOrder: (orderNumber: string) => void
  hydrate: () => void
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
  orders: [],
  archivedOrders: [],

  addOrder: (order) => {
    const updated = [order, ...get().orders]
    localStorage.setItem('repixl-orders', JSON.stringify(updated))
    set({ orders: updated })
  },

  updateStatus: (orderNumber, status) => {
    const updated = get().orders.map((o) =>
      o.orderNumber === orderNumber ? { ...o, status } : o
    )
    localStorage.setItem('repixl-orders', JSON.stringify(updated))
    set({ orders: updated })
  },

  archiveOrder: (orderNumber) => {
    const { orders, archivedOrders } = get()
    const order = orders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    const updatedOrders = orders.filter((o) => o.orderNumber !== orderNumber)
    const updatedArchived = [order, ...archivedOrders]
    localStorage.setItem('repixl-orders', JSON.stringify(updatedOrders))
    localStorage.setItem('repixl-archived-orders', JSON.stringify(updatedArchived))
    set({ orders: updatedOrders, archivedOrders: updatedArchived })
  },

  restoreOrder: (orderNumber) => {
    const { orders, archivedOrders } = get()
    const order = archivedOrders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    const updatedArchived = archivedOrders.filter((o) => o.orderNumber !== orderNumber)
    const updatedOrders = [order, ...orders]
    localStorage.setItem('repixl-orders', JSON.stringify(updatedOrders))
    localStorage.setItem('repixl-archived-orders', JSON.stringify(updatedArchived))
    set({ orders: updatedOrders, archivedOrders: updatedArchived })
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-orders')
      if (stored) {
        const orders: Order[] = JSON.parse(stored)
        set({ orders })
      }
      const archivedStored = localStorage.getItem('repixl-archived-orders')
      if (archivedStored) {
        const archivedOrders: Order[] = JSON.parse(archivedStored)
        set({ archivedOrders })
      }
    } catch {
      // ignore
    }
  },
}))
