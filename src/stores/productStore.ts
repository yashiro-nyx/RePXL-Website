'use client'

import { create } from 'zustand'
import type { Product } from '@/types'
import { products as seedProducts } from '@/data/products'
import { productService } from '@/lib/data/productService'

interface ProductState {
  products: Product[]
  loading: boolean
  addProduct: (product: Product) => Promise<void>
  updateProduct: (slug: string, updates: Partial<Product>) => Promise<void>
  deleteProduct: (slug: string) => Promise<void>
  hydrate: () => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  // Seed synchronously so first paint has content; hydrate() replaces it with
  // API (or localStorage) data.
  products: seedProducts,
  loading: false,

  addProduct: async (product) => {
    // Optimistic in-memory update, then reconcile with the service result.
    set({ products: [...get().products, product] })
    const created = await productService.create(product)
    set({
      products: get().products.map((p) => (p.slug === created.slug ? created : p)),
    })
  },

  updateProduct: async (slug, updates) => {
    set({
      products: get().products.map((p) => (p.slug === slug ? { ...p, ...updates } : p)),
    })
    const updated = await productService.update(slug, updates)
    set({
      products: get().products.map((p) => (p.slug === slug ? updated : p)),
    })
  },

  deleteProduct: async (slug) => {
    set({ products: get().products.filter((p) => p.slug !== slug) })
    await productService.remove(slug)
  },

  hydrate: async () => {
    set({ loading: true })
    try {
      // Use listActive() so the storefront always gets live DB stock for ACTIVE
      // products only. The seed initialises the store synchronously on first
      // paint; this call replaces it with real data (including current stock).
      const products = await productService.listActive()
      if (products.length > 0) set({ products })
    } finally {
      set({ loading: false })
    }
  },
}))
