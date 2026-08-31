'use client'

import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { addressService } from '@/lib/data/addressService'

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
  addAddress: (addr: Omit<Address, 'id'>) => Promise<void>
  updateAddress: (id: string, addr: Omit<Address, 'id'>) => Promise<void>
  removeAddress: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
  getDefault: () => Address | undefined
  hydrate: () => Promise<void>
}

function currentEmail(): string | null {
  return useAuthStore.getState().userEmail || null
}

export const useAddressStore = create<AddressState>((set, get) => ({
  addresses: [],

  addAddress: async (addr) => {
    const addresses = get().addresses
    const isDefault = addresses.length === 0 ? true : addr.isDefault
    const payload = { ...addr, isDefault }
    const created = await addressService.add(currentEmail(), payload)
    const cleared = isDefault ? addresses.map((a) => ({ ...a, isDefault: false })) : addresses
    set({ addresses: [...cleared, created] })
  },

  updateAddress: async (id, addr) => {
    set({
      addresses: get().addresses.map((a) =>
        a.id === id
          ? { ...addr, id, isDefault: addr.isDefault ? true : a.isDefault }
          : addr.isDefault
            ? { ...a, isDefault: false }
            : a
      ),
    })
    await addressService.update(currentEmail(), id, addr)
  },

  removeAddress: async (id) => {
    let updated = get().addresses.filter((a) => a.id !== id)
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated = updated.map((a, i) => ({ ...a, isDefault: i === 0 }))
    }
    set({ addresses: updated })
    await addressService.remove(currentEmail(), id)
  },

  setDefault: async (id) => {
    set({ addresses: get().addresses.map((a) => ({ ...a, isDefault: a.id === id })) })
    await addressService.setDefault(currentEmail(), id)
  },

  getDefault: () => get().addresses.find((a) => a.isDefault),

  hydrate: async () => {
    try {
      const addresses = await addressService.list(currentEmail())
      set({ addresses })
    } catch {
      set({ addresses: [] })
    }
  },
}))
