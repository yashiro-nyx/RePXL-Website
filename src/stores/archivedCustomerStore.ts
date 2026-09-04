'use client'

import { create } from 'zustand'

export interface ArchivedCustomer {
  id: string
  name: string
  email: string
  role: string
  archivedAt: string
}

interface ArchivedCustomerState {
  archivedCustomers: ArchivedCustomer[]
  archiveCustomer: (customer: { id: string; name: string; email: string; role: string }) => void
  restoreCustomer: (id: string) => ArchivedCustomer | undefined
  hydrate: () => void
}

/**
 * Legacy in-memory store for archived customers.
 * The actual archive/restore state is authoritative in PostgreSQL via
 * the /api/admin/customers API (isArchived field). This store is kept
 * for backward compatibility with any remaining UI references but no
 * longer writes to localStorage or acts as the source of truth.
 * Admin → Customers and Admin → Archived Customers both read from the API.
 */
export const useArchivedCustomerStore = create<ArchivedCustomerState>((set, get) => ({
  archivedCustomers: [],

  archiveCustomer: (customer) => {
    // In-memory only — real archival is done via /api/admin/customers/[id]/archive
    const archived: ArchivedCustomer = {
      ...customer,
      archivedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    }
    set({ archivedCustomers: [archived, ...get().archivedCustomers] })
    // No longer writes to localStorage — API is authoritative
  },

  restoreCustomer: (id) => {
    const { archivedCustomers } = get()
    const customer = archivedCustomers.find((c) => c.id === id)
    if (!customer) return undefined
    set({ archivedCustomers: archivedCustomers.filter((c) => c.id !== id) })
    // No longer writes to localStorage — API is authoritative
    return customer
  },

  hydrate: () => {
    // No longer reads from localStorage. The admin pages read directly from
    // /api/admin/customers?archived=true. This method is a no-op kept for
    // any remaining callers.
    try {
      // Clear any stale localStorage data from the old implementation
      localStorage.removeItem('repixl-archived-customers')
    } catch { /* ignore */ }
  },
}))
