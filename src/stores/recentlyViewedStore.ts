'use client'

import { create } from 'zustand'

const STORAGE_KEY = 'repixl-recently-viewed'
const MAX_ITEMS = 6

interface RecentlyViewedState {
  slugs: string[]
  hydrated: boolean
  hydrate: () => void
  record: (slug: string) => void
}

export const useRecentlyViewedStore = create<RecentlyViewedState>((set, get) => ({
  slugs: [],
  hydrated: false,
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') return
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]')
      set({ slugs: Array.isArray(saved) ? saved.filter((slug): slug is string => typeof slug === 'string').slice(0, MAX_ITEMS) : [], hydrated: true })
    } catch {
      set({ hydrated: true })
    }
  },
  record: (slug) => {
    if (typeof window === 'undefined') return
    const slugs = [slug, ...get().slugs.filter((item) => item !== slug)].slice(0, MAX_ITEMS)
    set({ slugs, hydrated: true })
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs))
  },
}))
