'use client'

import { create } from 'zustand'
import { useAuthStore } from './authStore'

interface WishlistState {
  slugs: string[]
  addToWishlist: (slug: string) => void
  removeFromWishlist: (slug: string) => void
  isInWishlist: (slug: string) => boolean
  hydrate: () => void
}

function getKey() {
  const email = useAuthStore.getState().userEmail
  return email ? `repixl-wishlist-${email}` : 'repixl-wishlist-guest'
}

function persist(slugs: string[]) {
  localStorage.setItem(getKey(), JSON.stringify(slugs))
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  slugs: [],

  addToWishlist: (slug) => {
    if (get().slugs.includes(slug)) return
    const updated = [...get().slugs, slug]
    persist(updated); set({ slugs: updated })
  },

  removeFromWishlist: (slug) => {
    const updated = get().slugs.filter((s) => s !== slug)
    persist(updated); set({ slugs: updated })
  },

  isInWishlist: (slug) => get().slugs.includes(slug),

  hydrate: () => {
    try {
      const stored = localStorage.getItem(getKey())
      if (stored) {
        const data = JSON.parse(stored)
        if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string') {
          set({ slugs: data })
        } else { set({ slugs: [] }) }
      } else { set({ slugs: [] }) }
    } catch { set({ slugs: [] }) }
  },
}))
