'use client'

import { create } from 'zustand'
import { useAuthStore } from './authStore'

const MAX_COMPARE = 3

interface CompareState {
  slugs: string[]
  addToCompare: (slug: string) => 'added' | 'already' | 'full'
  removeFromCompare: (slug: string) => void
  isInCompare: (slug: string) => boolean
  hydrate: () => void
}

function getKey() {
  const email = useAuthStore.getState().userEmail
  return email ? `repixl-compare-${email}` : 'repixl-compare-guest'
}

function persist(slugs: string[]) {
  localStorage.setItem(getKey(), JSON.stringify(slugs))
}

export const useCompareStore = create<CompareState>((set, get) => ({
  slugs: [],

  addToCompare: (slug) => {
    const { slugs } = get()
    if (slugs.includes(slug)) return 'already'
    if (slugs.length >= MAX_COMPARE) return 'full'
    const updated = [...slugs, slug]
    persist(updated); set({ slugs: updated })
    return 'added'
  },

  removeFromCompare: (slug) => {
    const updated = get().slugs.filter((s) => s !== slug)
    persist(updated); set({ slugs: updated })
  },

  isInCompare: (slug) => get().slugs.includes(slug),

  hydrate: () => {
    try {
      const stored = localStorage.getItem(getKey())
      if (stored) {
        const slugs: string[] = JSON.parse(stored)
        set({ slugs: slugs.slice(0, MAX_COMPARE) })
      } else { set({ slugs: [] }) }
    } catch { set({ slugs: [] }) }
  },
}))
