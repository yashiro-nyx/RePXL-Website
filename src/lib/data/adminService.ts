'use client'

import { apiClient } from '@/lib/api-client'

export interface AdminCustomer {
  id: string
  name: string
  email: string
  role: string
  orders?: number
  reviews?: number
}

interface ApiCustomer {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'CUSTOMER' | 'ADMIN'
  isArchived: boolean
  _count?: { orders: number; reviews: number }
}

export interface AdminStats {
  products: {
    total: number
    active: number
    lowStock: number
    outOfStock: number
  }
  orders: {
    total: number
    processing: number
    shipped: number
    delivered: number
    completed: number
    cancelled: number
  }
  customers: { total: number }
  revenue: { total: number }
  reviews: { total: number }
  vouchers: { active: number }
}

export interface AdminLogEntry {
  id: string
  action: string
  details: string
  adminName: string
  createdAt: string
}

interface ApiLog {
  id: string
  action: string
  details: string
  adminName: string
  createdAt: string
}

function toCustomer(u: ApiCustomer): AdminCustomer {
  return {
    id: u.id,
    name: `${u.firstName} ${u.lastName}`.trim() || u.email,
    email: u.email,
    role: u.role === 'ADMIN' ? 'Admin' : 'User',
    orders: u._count?.orders,
    reviews: u._count?.reviews,
  }
}

export const adminService = {
  async listCustomers(): Promise<AdminCustomer[]> {
    const res = await apiClient.getPaginated<ApiCustomer>(
      '/api/admin/customers?limit=100&archived=false'
    )
    return (res.data ?? []).map(toCustomer)
  },

  async archiveCustomer(id: string): Promise<void> {
    await apiClient.post(`/api/admin/customers/${id}/archive`)
  },

  async restoreCustomer(id: string): Promise<void> {
    await apiClient.delete(`/api/admin/customers/${id}/archive`)
  },

  async stats(fallback: AdminStats): Promise<AdminStats> {
    return apiClient.get<AdminStats>('/api/admin/stats')
  },

  async logs(): Promise<AdminLogEntry[]> {
    const res = await apiClient.getPaginated<ApiLog>(
      '/api/admin/logs?limit=100'
    )
    return (res.data ?? []).map((l) => ({
      id: l.id,
      action: l.action,
      details: l.details,
      adminName: l.adminName,
      createdAt: l.createdAt,
    }))
  },
}
