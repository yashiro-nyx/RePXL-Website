'use client'

import { create } from 'zustand'

export interface Address {
  id: string
  fullName: string
  address: string
  city: string
  postalCode: string
  phone: string
  isDefault: boolean
}

interface AddressState {
  addresses: Address[]
  addAddress: (addr: Omit<Address, 'id'>) => void
  updateAddress: (id: string, addr: Omit<Address, 'id'>) => void
  removeAddress: (id: string) => void
  setDefault: (id: string) => void
  getDefault: () => Address | undefined
  hydrate: () => void
}

function persist(addresses: Address[]) {
  localStorage.setItem('repixl-addresses', JSON.stringify(addresses))
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],

  addAddress: (addr) => {
    const id = `addr-${Date.now().toString(36)}`
    const addresses = get().addresses
    // If first address, make it default
    const isDefault = addresses.length === 0 ? true : addr.isDefault
    const updated = isDefault
      ? [...addresses.map((a) => ({ ...a, isDefault: false })), { ...addr, id, isDefault: true }]
      : [...addresses, { ...addr, id, isDefault: false }]
    persist(updated)
    set({ addresses: updated })
  },

  updateAddress: (id, addr) => {
    const updated = get().addresses.map((a) =>
      a.id === id
        ? { ...addr, id, isDefault: addr.isDefault ? true : a.isDefault }
        : addr.isDefault ? { ...a, isDefault: false } : a
    )
    persist(updated)
    set({ addresses: updated })
  },

  removeAddress: (id) => {
    let updated = get().addresses.filter((a) => a.id !== id)
    // If we removed the default, make the first one default
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated = updated.map((a, i) => ({ ...a, isDefault: i === 0 }))
    }
    persist(updated)
    set({ addresses: updated })
  },

  setDefault: (id) => {
    const updated = get().addresses.map((a) => ({ ...a, isDefault: a.id === id }))
    persist(updated)
    set({ addresses: updated })
  },

  getDefault: () => get().addresses.find((a) => a.isDefault),

  hydrate: () => {
    try {
      const stored = localStorage.getItem('repixl-addresses')
      if (stored) {
        set({ addresses: JSON.parse(stored) })
      }
    } catch {
      // ignore
    }
  },
}))
