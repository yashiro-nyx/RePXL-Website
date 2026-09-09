'use client'

import { ApiClientError, type ApiResponse } from '@/lib/api-client'
import { apiToClientProduct, type ApiProduct } from '@/lib/mappers'

async function read<T>(url: string): Promise<ApiResponse<T>> {
  // Admin confirmation must perform a new server read, independent of storefront hydration.
  const response = await fetch(url, { credentials: 'include', cache: 'no-store' })
  const json: ApiResponse<T> = await response.json()
  if (!response.ok || !json.success) {
    throw new ApiClientError(json.error || 'Unable to load cameras', response.status, json.details)
  }
  return json
}

export const adminProductService = {
  async list(page: number, limit: number, brand = '', search = '') {
    const params = new URLSearchParams({ page: String(page), limit: String(limit),
      status: 'ACTIVE,INACTIVE,COMING_SOON,DISCONTINUED' })
    if (brand) params.set('brand', brand)
    if (search.trim()) params.set('search', search.trim())
    const json = await read<ApiProduct[]>(`/api/products?${params}`)
    return { products: (json.data ?? []).map(apiToClientProduct),
      total: json.pagination?.total ?? 0, totalPages: json.pagination?.totalPages ?? 1 }
  },
  async get(slug: string) {
    const json = await read<ApiProduct>(`/api/products/${encodeURIComponent(slug)}`)
    if (!json.data) throw new Error('Camera response was empty')
    return apiToClientProduct(json.data)
  },
  async brands() {
    return (await read<string[]>('/api/admin/products/brands')).data ?? []
  },
}

export function cameraSaveError(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.status === 401 || error.status === 403) return 'Your admin session is unavailable. Sign in again before saving.'
    if (error.status === 422) return error.details?.join(' · ') || error.message
    if (error.status === 409 || error.status === 404) return error.message
  }
  return 'We could not confirm the save. Check the camera after refreshing before trying again.'
}
