'use client'

// Order data service.
//
// ORDER HISTORY (list/archive/restore):
//   Always reads directly from the authenticated API — no localStorage fallback.
//   PostgreSQL is the single source of truth. If the API fails, the error
//   propagates so the UI can show an appropriate error/retry state.
//   localStorage is NOT used as an authoritative fallback for order history.
//
// MUTATIONS (create/updateStatus/archive/restore):
//   These write to the API. Status and archive mutations have no fallback;
//   they surface the error so the UI can handle it. Order creation falls back
//   only for genuine infrastructure outages (offline/5xx) because the checkout
//   has already completed client-side and we must not lose that event.

import { apiClient } from '@/lib/api-client'
import { isInfrastructureError } from './fallback'
import { apiToClientOrder, ORDER_STATUS_TO_API, type ApiOrder } from '@/lib/mappers'
import type { Order } from '@/stores/orderHistoryStore'

// localStorage keys used only as a warm cache for mutations (create fallback).
// They are NOT used as the authoritative order list on page load.
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
    // Write a warm cache for offline reference (NOT used on fresh page load)
    writeLocal(LS_ORDERS, orders)
    writeLocal(LS_ARCHIVED, archived)
    return { orders, archived }
  },

  /**
   * Create an order. On genuine infrastructure failure (offline/5xx) we store
   * a client-built snapshot locally so the data is not lost — but the primary
   * path must succeed through the API.
   */
  async create(input: CreateOrderInput, localOrder: Order): Promise<Order> {
    try {
      const created = await apiClient.post<ApiOrder>('/api/orders', input)
      const mapped = apiToClientOrder(created)
      writeLocal(LS_ORDERS, [mapped, ...readLocal(LS_ORDERS)])
      return mapped
    } catch (err) {
      if (!isInfrastructureError(err)) throw err
      // Infrastructure-only fallback: store the client-built order locally.
      // The UI should warn the user that their order may not have been saved
      // to the server.
      writeLocal(LS_ORDERS, [localOrder, ...readLocal(LS_ORDERS)])
      return localOrder
    }
  },

  /**
   * Update order status — API only, no localStorage fallback.
   * If the API is unavailable, surfaces the error rather than silently
   * writing a stale status to localStorage.
   */
  async updateStatus(orderNumber: string, status: Order['status']): Promise<void> {
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
