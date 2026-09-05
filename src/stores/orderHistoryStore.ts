'use client'

import { scopedAccountUpdate } from '@/lib/account-scope'

import { useAuthStore } from './authStore'
import { create } from 'zustand'
import type { Product } from '@/types'
import { orderService, type CreateOrderInput } from '@/lib/data/orderService'

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
  // Package tracking — populated by the admin update-tracking endpoint
  trackingNumber?: string
  deliveryStatus?: string
  trackingDescription?: string
  trackingProgress?: number
}

interface OrderHistoryState {
  orders: Order[]
  archivedOrders: Order[]
  /** Whether a hydrate() call is currently in-flight */
  loading: boolean
  /** Last hydration error, if any — cleared on successful hydrate */
  error: string | null
  addOrder: (input: CreateOrderInput) => Promise<Order>
  updateStatus: (orderNumber: string, status: Order['status']) => Promise<void>
  archiveOrder: (orderNumber: string) => Promise<void>
  restoreOrder: (orderNumber: string) => Promise<void>
  /**
   * Load orders from PostgreSQL. Throws on failure so callers can render an
   * error/retry state. Never silently substitutes stale cached data.
   */
  hydrate: () => Promise<void>
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
  orders: [],
  archivedOrders: [],
  loading: false,
  error: null,

  addOrder: async (input) => {
    const commit = scopedAccountUpdate<Partial<OrderHistoryState>>(set)
    const created = await orderService.create(input)
    commit({ orders: [created, ...get().orders] })
    return created
  },

  updateStatus: async (orderNumber, status) => {
    const commit = scopedAccountUpdate<Partial<OrderHistoryState>>(set)
    await orderService.updateStatus(orderNumber, status)
    commit({
      orders: get().orders.map((o) =>
        o.orderNumber === orderNumber ? { ...o, status } : o
      ),
    })
  },

  archiveOrder: async (orderNumber) => {
    const commit = scopedAccountUpdate<Partial<OrderHistoryState>>(set)
    const { orders, archivedOrders } = get()
    const order = orders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    await orderService.archive(orderNumber)
    commit({
      orders: orders.filter((o) => o.orderNumber !== orderNumber),
      archivedOrders: [order, ...archivedOrders],
    })
  },

  restoreOrder: async (orderNumber) => {
    const commit = scopedAccountUpdate<Partial<OrderHistoryState>>(set)
    const { orders, archivedOrders } = get()
    const order = archivedOrders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    await orderService.restore(orderNumber)
    commit({
      archivedOrders: archivedOrders.filter(
        (o) => o.orderNumber !== orderNumber
      ),
      orders: [order, ...orders],
    })
  },

  hydrate: async () => {
    const commit = scopedAccountUpdate<Partial<OrderHistoryState>>(set)
    commit({ loading: true, error: null })
    try {
      const { orders, archived } = await orderService.list()
      commit({ orders, archivedOrders: archived, loading: false, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders'
      commit({ orders: [], archivedOrders: [], loading: false, error: msg })
      // Re-throw so page-level components can decide how to handle it
      throw err
    }
  },
}))

useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail || state.role !== previous.role)
    useOrderHistoryStore.setState({
      orders: [],
      archivedOrders: [],
      error: null,
    })
})
