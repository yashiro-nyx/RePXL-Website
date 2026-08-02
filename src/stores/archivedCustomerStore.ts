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

export const useArchivedCustomerStore = create<ArchivedCustomerState>((set, get) => ({
  archivedCustomers: [],

  archiveCustomer: (customer) => {
    const archived: ArchivedCustomer = {
      ...customer,
      archivedAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
    }
    const updated = [archived, ...get().archivedCustomers]
    localStorage.setItem('repixl-archived-customers', JSON.stringify(updated))
    set({ archivedCustomers: updated })
  },

  restoreCustomer: (id) => {
    const { archivedCustomers } = get()
    const customer = archivedCustomers.find((c) => c.id === id)
    if (!customer) return undefined
    const updated = archivedCustomers.filter((c) => c.id !== id)
    localStorage.setItem('repixl-archived-customers', JSON.stringify(updated))
    set({ archivedCustomers: updated })
    return customer
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-archived-customers')
      if (stored) {
        set({ archivedCustomers: JSON.parse(stored) })
      }
    } catch {
      // ignore
    }
  },
}))
