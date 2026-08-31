'use client'

import { create } from 'zustand'
import { useAuthStore } from './authStore'
import { wishlistService } from '@/lib/data/wishlistService'

interface WishlistState {
  slugs: string[]
  addToWishlist: (slug: string) => Promise<void>
  removeFromWishlist: (slug: string) => Promise<void>
  isInWishlist: (slug: string) => boolean
  hydrate: () => Promise<void>
}

function currentEmail(): string | null {
  return useAuthStore.getState().userEmail || null
}

export const useWishlistStore = create<WishlistState>((set, get) => ({
  slugs: [],

  addToWishlist: async (slug) => {
    if (get().slugs.includes(slug)) return
    set({ slugs: [...get().slugs, slug] })
    await wishlistService.add(currentEmail(), slug)
  },

  removeFromWishlist: async (slug) => {
    set({ slugs: get().slugs.filter((s) => s !== slug) })
    await wishlistService.remove(currentEmail(), slug)
  },

  isInWishlist: (slug) => get().slugs.includes(slug),

  hydrate: async () => {
    try {
      const slugs = await wishlistService.list(currentEmail())
      set({ slugs })
    } catch {
      set({ slugs: [] })
    }
  },
}))
