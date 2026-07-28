'use client'

import { create } from 'zustand'
import type { CartItem } from '@/types'
import { useProductStore } from './productStore'
import { useAuthStore } from './authStore'

interface CartState {
  items: CartItem[]
  addToCart: (slug: string, quantity?: number) => void
  updateQuantity: (slug: string, newQty: number) => void
  removeFromCart: (slug: string) => void
  isInCart: (slug: string) => boolean
  getQuantity: (slug: string) => number
  clearCart: () => void
  hydrate: () => void
}

function getKey() {
  const email = useAuthStore.getState().userEmail
  return email ? `repixl-cart-${email}` : 'repixl-cart-guest'
}

function persist(items: CartItem[]) {
  localStorage.setItem(getKey(), JSON.stringify(items))
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],

  addToCart: (slug, quantity = 1) => {
    const product = useProductStore.getState().products.find((p) => p.slug === slug)
    if (!product || product.stock <= 0) return
    const { items } = get()
    const existing = items.find((i) => i.slug === slug)
    if (existing) {
      const newQty = Math.min(existing.quantity + quantity, product.stock)
      const updated = items.map((i) => i.slug === slug ? { ...i, quantity: newQty } : i)
      persist(updated); set({ items: updated })
    } else {
      const capped = Math.min(quantity, product.stock)
      if (capped <= 0) return
      const updated = [...items, { slug, quantity: capped }]
      persist(updated); set({ items: updated })
    }
  },

  updateQuantity: (slug, newQty) => {
    const product = useProductStore.getState().products.find((p) => p.slug === slug)
    if (!product) return
    if (newQty <= 0) { get().removeFromCart(slug); return }
    const capped = Math.min(newQty, product.stock)
    const updated = get().items.map((i) => i.slug === slug ? { ...i, quantity: capped } : i)
    persist(updated); set({ items: updated })
  },

  removeFromCart: (slug) => {
    const updated = get().items.filter((i) => i.slug !== slug)
    persist(updated); set({ items: updated })
  },

  isInCart: (slug) => get().items.some((i) => i.slug === slug),
  getQuantity: (slug) => get().items.find((i) => i.slug === slug)?.quantity ?? 0,

  clearCart: () => {
    localStorage.removeItem(getKey())
    set({ items: [] })
  },

  hydrate: () => {
    try {
      const stored = localStorage.getItem(getKey())
      if (stored) set({ items: JSON.parse(stored) })
      else set({ items: [] })
    } catch { set({ items: [] }) }
  },
}))
