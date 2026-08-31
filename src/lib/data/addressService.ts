'use client'

// Address data service: API-first with per-user localStorage fallback.

import { apiClient } from '@/lib/api-client'
import { withFallback } from './fallback'
import type { Address } from '@/stores/addressStore'

interface ApiAddress {
  id: string
  fullName: string
  address: string
  barangay?: string
  city: string
  province?: string
  postalCode: string
  phone: string
  isDefault: boolean
}

function localKey(email: string | null) {
  return email ? `repixl-addresses-${email}` : 'repixl-addresses-guest'
}

function readLocal(email: string | null): Address[] {
  try {
    const stored = localStorage.getItem(localKey(email))
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function writeLocal(email: string | null, addresses: Address[]) {
  try {
    localStorage.setItem(localKey(email), JSON.stringify(addresses))
  } catch {
    /* ignore */
  }
}

function toClient(a: ApiAddress): Address {
  return {
    id: a.id,
    fullName: a.fullName,
    address: a.address,
    barangay: a.barangay ?? '',
    city: a.city,
    province: a.province ?? '',
    postalCode: a.postalCode,
    phone: a.phone,
    isDefault: a.isDefault,
  }
}

export const addressService = {
  async list(email: string | null): Promise<Address[]> {
    return withFallback<Address[]>(
      async () => {
        const items = await apiClient.get<ApiAddress[]>('/api/addresses')
        return items.map(toClient)
      },
      () => readLocal(email),
      { mirror: (addresses) => writeLocal(email, addresses) }
    )
  },

  async add(email: string | null, addr: Omit<Address, 'id'>): Promise<Address> {
    return withFallback<Address>(
      async () => {
        const created = await apiClient.post<ApiAddress>('/api/addresses', addr)
        return toClient(created)
      },
      () => {
        const id = `addr-${Date.now().toString(36)}`
        const created: Address = { ...addr, id }
        writeLocal(email, [...readLocal(email), created])
        return created
      }
    )
  },

  async update(email: string | null, id: string, addr: Omit<Address, 'id'>): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.put(`/api/addresses/${id}`, addr)
      },
      () => {
        writeLocal(
          email,
          readLocal(email).map((a) => (a.id === id ? { ...addr, id } : a))
        )
      }
    )
  },

  async remove(email: string | null, id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.delete(`/api/addresses/${id}`)
      },
      () => {
        writeLocal(
          email,
          readLocal(email).filter((a) => a.id !== id)
        )
      }
    )
  },

  async setDefault(email: string | null, id: string): Promise<void> {
    await withFallback<void>(
      async () => {
        await apiClient.patch(`/api/addresses/${id}/default`)
      },
      () => {
        writeLocal(
          email,
          readLocal(email).map((a) => ({ ...a, isDefault: a.id === id }))
        )
      }
    )
  },
}
