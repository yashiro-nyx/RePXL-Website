'use client'

// Also maintains a slug -> productId cache so cart/wishlist/review services can
// resolve the cuid `id` the API expects from the `slug` the client UI uses.

import { apiClient } from '@/lib/api-client'
import {
  apiToClientProduct,
  clientToApiProduct,
  type ApiProduct,
} from '@/lib/mappers'
import type { Product } from '@/types'

// slug -> API id. Populated whenever we fetch products from the API.
const slugToId = new Map<string, string>()

export function getProductId(slug: string): string | undefined {
  return slugToId.get(slug)
}

function cacheIds(apiProducts: ApiProduct[]) {
  for (const p of apiProducts) slugToId.set(p.slug, p.id)
}

export const productService = {
  /**
   * Fetch the full catalogue including all statuses (for admin use).
   */
  async list(): Promise<Product[]> {
    const res = await apiClient.getPaginated<ApiProduct>(
      '/api/products?limit=100&status=ACTIVE,INACTIVE,COMING_SOON,DISCONTINUED&sortBy=createdAt&sortOrder=desc'
    )
    const apiProducts = (res.data ?? []) as ApiProduct[]
    cacheIds(apiProducts)
    return apiProducts.map(apiToClientProduct)
  },

  /**
   * Fetch only ACTIVE products with live stock from the database.
   * Used by the storefront product listing, search, compare, and wishlist pages.
   * Stock values come directly from the DB so out-of-stock products reflect
   * their real state immediately after a purchase.
   */
  async listActive(): Promise<Product[]> {
    const res = await apiClient.getPaginated<ApiProduct>(
      '/api/products?limit=100&status=ACTIVE&sortBy=createdAt&sortOrder=desc'
    )
    const apiProducts = (res.data ?? []) as ApiProduct[]
    cacheIds(apiProducts)
    return apiProducts.map(apiToClientProduct)
  },

  async create(product: Product): Promise<Product> {
    const created = await apiClient.post<ApiProduct>(
      '/api/products',
      clientToApiProduct(product)
    )
    slugToId.set(created.slug, created.id)
    return apiToClientProduct(created)
  },

  async update(slug: string, updates: Partial<Product>): Promise<Product> {
    const updated = await apiClient.put<ApiProduct>(
      `/api/products/${slug}`,
      clientToApiProduct(updates)
    )
    slugToId.set(updated.slug, updated.id)
    return apiToClientProduct(updated)
  },

  async remove(slug: string): Promise<void> {
    await apiClient.delete<{ message: string }>(`/api/products/${slug}`)
    slugToId.delete(slug)
  },
}
