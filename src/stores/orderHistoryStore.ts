'use client'

import { create } from 'zustand'
import type { Product } from '@/types'
import { orderService } from '@/lib/data/orderService'

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
  addOrder: (order: Order) => Promise<Order>
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

  addOrder: async (order) => {
    const created = await orderService.create(
      {
        fullName: order.fullName,
        address: order.address,
        barangay: order.barangay,
        city: order.city,
        province: order.province,
        postalCode: order.postalCode,
        courierName: order.courierName,
        courierEstimate: order.courierEstimate,
        paymentMethod: order.paymentMethod,
        shippingCost: order.shippingCost,
      },
      order
    )
    set({ orders: [created, ...get().orders] })
    return created
  },

  updateStatus: async (orderNumber, status) => {
    // Optimistic UI: update in-memory immediately, then persist to server
    set({
      orders: get().orders.map((o) =>
        o.orderNumber === orderNumber ? { ...o, status } : o
      ),
    })
    // Fire-and-forget to server — if it fails the in-memory state is already updated
    // and will be corrected on the next hydrate()
    orderService.updateStatus(orderNumber, status).catch((err) => {
      console.error('[orderStore] updateStatus failed:', err)
    })
  },

  archiveOrder: async (orderNumber) => {
    const { orders, archivedOrders } = get()
    const order = orders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    set({
      orders: orders.filter((o) => o.orderNumber !== orderNumber),
      archivedOrders: [order, ...archivedOrders],
    })
    await orderService.archive(orderNumber)
  },

  restoreOrder: async (orderNumber) => {
    const { orders, archivedOrders } = get()
    const order = archivedOrders.find((o) => o.orderNumber === orderNumber)
    if (!order) return
    set({
      archivedOrders: archivedOrders.filter((o) => o.orderNumber !== orderNumber),
      orders: [order, ...orders],
    })
    await orderService.restore(orderNumber)
  },

  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      const { orders, archived } = await orderService.list()
      set({ orders, archivedOrders: archived, loading: false, error: null })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load orders'
      set({ loading: false, error: msg })
      // Re-throw so page-level components can decide how to handle it
      throw err
    }
  },
}))
