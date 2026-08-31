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
  city: string
  postalCode: string
  status: 'Processing' | 'Shipped' | 'Delivered' | 'Completed' | 'Cancelled'
  userEmail?: string
}

interface OrderHistoryState {
  orders: Order[]
  archivedOrders: Order[]
  addOrder: (order: Order) => Promise<Order>
  updateStatus: (orderNumber: string, status: Order['status']) => Promise<void>
  archiveOrder: (orderNumber: string) => Promise<void>
  restoreOrder: (orderNumber: string) => Promise<void>
  hydrate: () => Promise<void>
}

export const useOrderHistoryStore = create<OrderHistoryState>((set, get) => ({
  orders: [],
  archivedOrders: [],

  addOrder: async (order) => {
    // Persist via the transactional API (falls back to the client-built order).
    const created = await orderService.create(
      {
        fullName: order.fullName,
        address: order.address,
        city: order.city,
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
    set({
      orders: get().orders.map((o) =>
        o.orderNumber === orderNumber ? { ...o, status } : o
      ),
    })
    await orderService.updateStatus(orderNumber, status)
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
    try {
      const { orders, archived } = await orderService.list()
      set({ orders, archivedOrders: archived })
    } catch {
      // ignore — keep current
    }
  },
}))
