'use client'

// Admin data service: API-first (role-protected endpoints) with localStorage
// fallback for demo/offline use.

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'

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
  products: { total: number; active: number; lowStock: number; outOfStock: number }
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

const MOCK_CUSTOMERS: AdminCustomer[] = [
  { id: '1', name: 'Mia Rodriguez', email: 'mia.rodriguez@gmail.com', role: 'User' },
  { id: '2', name: 'Jordan Torres', email: 'jordan.torres@yahoo.com', role: 'User' },
  { id: '3', name: 'Sam Davis', email: 'sam.davis@gmail.com', role: 'User' },
  { id: '4', name: 'Alyssa Kim', email: 'alyssa.kim@outlook.com', role: 'User' },
  { id: '5', name: 'Chris Lee', email: 'chris.lee@hotmail.com', role: 'User' },
  { id: '6', name: 'Taylor Morgan', email: 'taylor.morgan@gmail.com', role: 'User' },
  { id: '7', name: 'Riley Nash', email: 'riley.nash@yahoo.com', role: 'User' },
  { id: '8', name: 'Casey Flores', email: 'casey.flores@gmail.com', role: 'User' },
  { id: '9', name: 'Morgan Park', email: 'morgan.park@outlook.com', role: 'User' },
  { id: '10', name: 'Avery Chen', email: 'avery.chen@gmail.com', role: 'User' },
]

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
    return withFallback<AdminCustomer[]>(
      async () => {
        const res = await apiClient.getPaginated<ApiCustomer>(
          '/api/admin/customers?limit=100&archived=false'
        )
        return (res.data ?? []).map(toCustomer)
      },
      () => MOCK_CUSTOMERS
    )
  },

  async archiveCustomer(id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.post(`/api/admin/customers/${id}/archive`)
      },
      () => {
        /* archivedCustomerStore keeps the localStorage copy */
      }
    )
  },

  async restoreCustomer(id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete(`/api/admin/customers/${id}/archive`)
      },
      () => {
        /* handled by archivedCustomerStore */
      }
    )
  },

  async stats(fallback: AdminStats): Promise<AdminStats> {
    return withFallback<AdminStats>(
      async () => apiClient.get<AdminStats>('/api/admin/stats'),
      () => fallback
    )
  },

  async logs(): Promise<AdminLogEntry[]> {
    return withFallback<AdminLogEntry[]>(
      async () => {
        const res = await apiClient.getPaginated<ApiLog>('/api/admin/logs?limit=100')
        return (res.data ?? []).map((l) => ({
          id: l.id,
          action: l.action,
          details: l.details,
          adminName: l.adminName,
          createdAt: l.createdAt,
        }))
      },
      () => []
    )
  },
}
