'use client'

import { reportActionFailure } from '@/lib/action-error'
import { create } from 'zustand'
import type { Product } from '@/types'
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
  products: [],
  loading: false,

  addProduct: async (product) => {
    const created = await productService.create(product)
    set({ products: [...get().products, created] })
  },

  updateProduct: async (slug, updates) => {
    const updated = await productService.update(slug, updates)
    set({
      products: get().products.map((p) => (p.slug === slug ? updated : p)),
    })
  },

  deleteProduct: async (slug) => {
    await productService.remove(slug)
    set({ products: get().products.filter((p) => p.slug !== slug) })
  },

  hydrate: async () => {
    set({ loading: true })
    try {
      // The catalogue is always fetched from the server.
      const products = await productService.listActive()
      set({ products })
    } catch {
      set({ products: [] })
      reportActionFailure()
    } finally {
      set({ loading: false })
    }
  },
}))
