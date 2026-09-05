'use client'

import { apiClient } from '@/lib/api-client'
import {
  apiToClientOrder,
  ORDER_STATUS_TO_API,
  type ApiOrder,
} from '@/lib/mappers'
import type { Order } from '@/stores/orderHistoryStore'

export interface CreateOrderInput {
  fullName: string
  address: string
  barangay?: string
  city: string
  province?: string
  postalCode: string
  courierName: string
  courierEstimate: string
  paymentMethod: string
  voucherCode?: string | null
  shippingCost: number
}

export const orderService = {
  /**
   * Load the current user's orders directly from PostgreSQL via the API.
   * NEVER falls back to localStorage — stale cached data must not replace
   * authoritative server data. If the API fails, throws so the caller can
   * show an error/retry state.
   */
  async list(): Promise<{ orders: Order[]; archived: Order[] }> {
    const [activeRes, archivedRes] = await Promise.all([
      apiClient.getPaginated<ApiOrder>('/api/orders?limit=100&archived=false'),
      apiClient.getPaginated<ApiOrder>('/api/orders?limit=100&archived=true'),
    ])
    const orders = (activeRes.data ?? []).map(apiToClientOrder)
    const archived = (archivedRes.data ?? []).map(apiToClientOrder)
    return { orders, archived }
  },

  // Only the server response can confirm an order was created.
  async create(input: CreateOrderInput): Promise<Order> {
    return apiToClientOrder(
      await apiClient.post<ApiOrder>('/api/orders', input)
    )
  },

  /**
   * Update order status — API only, no localStorage fallback.
   * If the API is unavailable, surfaces the error rather than silently
   * writing a stale status to localStorage.
   */
  async updateStatus(
    orderNumber: string,
    status: Order['status']
  ): Promise<void> {
    await apiClient.patch(`/api/orders/${orderNumber}`, {
      status: ORDER_STATUS_TO_API[status],
    })
  },

  async archive(orderNumber: string): Promise<void> {
    await apiClient.post(`/api/orders/${orderNumber}/archive`)
  },

  async restore(orderNumber: string): Promise<void> {
    await apiClient.delete(`/api/orders/${orderNumber}/archive`)
  },
}
