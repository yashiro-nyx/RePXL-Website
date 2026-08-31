'use client'

// Order data service: API-first with localStorage fallback.
// POST /api/orders builds the order server-side from the DB cart (transactional:
// decrements stock, applies voucher, clears cart). The client passes only the
// shipping/courier/payment fields. On fallback we persist the client-built order.

import { apiClient } from '@/lib/api-client'
import { withFallback, isInfrastructureError } from './fallback'
import { apiToClientOrder, ORDER_STATUS_TO_API, type ApiOrder } from '@/lib/mappers'
import type { Order } from '@/stores/orderHistoryStore'

const LS_ORDERS = 'repixl-orders'
const LS_ARCHIVED = 'repixl-archived-orders'

function readLocal(key: string): Order[] {
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeLocal(key: string, orders: Order[]) {
  try {
    localStorage.setItem(key, JSON.stringify(orders))
  } catch {
    /* ignore */
  }
}

export interface CreateOrderInput {
  fullName: string
  address: string
  city: string
  postalCode: string
  courierName: string
  courierEstimate: string
  paymentMethod: string
  voucherCode?: string | null
  shippingCost: number
}

export const orderService = {
  /** Load the current user's orders (admin sees all). */
  async list(): Promise<{ orders: Order[]; archived: Order[] }> {
    return withFallback<{ orders: Order[]; archived: Order[] }>(
      async () => {
        const [activeRes, archivedRes] = await Promise.all([
          apiClient.getPaginated<ApiOrder>('/api/orders?limit=100&archived=false'),
          apiClient.getPaginated<ApiOrder>('/api/orders?limit=100&archived=true'),
        ])
        return {
          orders: (activeRes.data ?? []).map(apiToClientOrder),
          archived: (archivedRes.data ?? []).map(apiToClientOrder),
        }
      },
      () => ({
        orders: readLocal(LS_ORDERS),
        archived: readLocal(LS_ARCHIVED),
      }),
      {
        mirror: ({ orders, archived }) => {
          writeLocal(LS_ORDERS, orders)
          writeLocal(LS_ARCHIVED, archived)
        },
      }
    )
  },

  /**
   * Create an order. Prefers the transactional API endpoint; on API failure the
   * client-built order (with its Product snapshots) is stored locally.
   */
  async create(input: CreateOrderInput, localOrder: Order): Promise<Order> {
    try {
      const created = await apiClient.post<ApiOrder>('/api/orders', input)
      const mapped = apiToClientOrder(created)
      writeLocal(LS_ORDERS, [mapped, ...readLocal(LS_ORDERS)])
      return mapped
    } catch (err) {
      if (!isInfrastructureError(err)) throw err
      // Fallback: store the client-built order locally.
      writeLocal(LS_ORDERS, [localOrder, ...readLocal(LS_ORDERS)])
      return localOrder
    }
  },

  async updateStatus(orderNumber: string, status: Order['status']): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.patch(`/api/orders/${orderNumber}`, {
          status: ORDER_STATUS_TO_API[status],
        })
      },
      () => {
        writeLocal(
          LS_ORDERS,
          readLocal(LS_ORDERS).map((o) =>
            o.orderNumber === orderNumber ? { ...o, status } : o
          )
        )
      }
    )
  },

  async archive(orderNumber: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.post(`/api/orders/${orderNumber}/archive`)
      },
      () => {
        const orders = readLocal(LS_ORDERS)
        const order = orders.find((o) => o.orderNumber === orderNumber)
        if (!order) return
        writeLocal(LS_ORDERS, orders.filter((o) => o.orderNumber !== orderNumber))
        writeLocal(LS_ARCHIVED, [order, ...readLocal(LS_ARCHIVED)])
      }
    )
  },

  async restore(orderNumber: string): Promise<void> {
    await withFallback<void>(
      async () => {
        // DELETE on the archive endpoint un-archives.
        await apiClient.delete(`/api/orders/${orderNumber}/archive`)
      },
      () => {
        const archived = readLocal(LS_ARCHIVED)
        const order = archived.find((o) => o.orderNumber === orderNumber)
        if (!order) return
        writeLocal(LS_ARCHIVED, archived.filter((o) => o.orderNumber !== orderNumber))
        writeLocal(LS_ORDERS, [order, ...readLocal(LS_ORDERS)])
      }
    )
  },
}
