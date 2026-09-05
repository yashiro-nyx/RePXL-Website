'use client'

import { reportActionFailure } from '@/lib/action-error'
import { scopedAccountUpdate } from '@/lib/account-scope'

import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { addressService } from '@/lib/data/addressService'

export interface Address {
  id: string
  fullName: string
  address: string
  barangay: string
  city: string
  province: string
  postalCode: string
  phone: string
  isDefault: boolean
  // PSGC codes for cascading dropdown re-population
  regionCode?: string
  provinceCode?: string
  cityCode?: string
}

interface AddressState {
  addresses: Address[]
  addAddress: (addr: Omit<Address, 'id'>) => Promise<void>
  updateAddress: (id: string, addr: Omit<Address, 'id'>) => Promise<void>
  removeAddress: (id: string) => Promise<void>
  setDefault: (id: string) => Promise<void>
  getDefault: () => Address | undefined
  hydrate: () => Promise<void>
  reset: () => void
}

function currentEmail(): string | null {
  return useAuthStore.getState().userEmail || null
}

export const useAddressStore = create<AddressState>((set, get) => {
  const mutate = async (action: (email: string | null) => Promise<unknown>) => {
    const commit = scopedAccountUpdate<Partial<AddressState>>(set)
    const email = currentEmail()
    await action(email)
    // Default selection and normalized fields are decided by the server.
    commit({ addresses: await addressService.list(email) })
  }
  return {
    addresses: [],
    reset: () => set({ addresses: [] }),
    addAddress: (address) => mutate((email) => addressService.add(email, address)),
    updateAddress: (id, address) => mutate((email) => addressService.update(email, id, address)),
    removeAddress: (id) => mutate((email) => addressService.remove(email, id)),
    setDefault: (id) => mutate((email) => addressService.setDefault(email, id)),
    getDefault: () => get().addresses.find((address) => address.isDefault),
    hydrate: async () => {
      const commit = scopedAccountUpdate<Partial<AddressState>>(set)
      const email = currentEmail()
      if (!email) { commit({ addresses: [] }); return }
      try { commit({ addresses: await addressService.list(email) }) }
      catch { commit({ addresses: [] }); reportActionFailure() }
    },
  }
})
useAuthStore.subscribe((state, previous) => {
  if (state.userEmail !== previous.userEmail || state.role !== previous.role) useAddressStore.setState({ addresses: [] })
})
