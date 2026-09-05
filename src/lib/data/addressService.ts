'use client'

import { apiClient } from '@/lib/api-client'
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
  // PSGC codes for cascading dropdown re-population
  regionCode?: string
  provinceCode?: string
  cityCode?: string
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
    regionCode: a.regionCode ?? '',
    provinceCode: a.provinceCode ?? '',
    cityCode: a.cityCode ?? '',
  }
}

export const addressService = {
  async list(email: string | null): Promise<Address[]> {
    const items = await apiClient.get<ApiAddress[]>('/api/addresses')
    return items.map(toClient)
  },

  async add(email: string | null, addr: Omit<Address, 'id'>): Promise<Address> {
    const created = await apiClient.post<ApiAddress>('/api/addresses', addr)
    return toClient(created)
  },

  async update(
    email: string | null,
    id: string,
    addr: Omit<Address, 'id'>
  ): Promise<void> {
    await apiClient.put(`/api/addresses/${id}`, addr)
  },

  async remove(email: string | null, id: string): Promise<void> {
    await apiClient.delete(`/api/addresses/${id}`)
  },

  async setDefault(email: string | null, id: string): Promise<void> {
    await apiClient.put(`/api/addresses/${id}/default`)
  },
}
