'use client'

import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  hydrate: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',

  setTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('repixl-theme', theme)
    set({ theme })
  },

  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    get().setTheme(next)
  },

  hydrate: () => {
    // 1. Check localStorage
    const stored = localStorage.getItem('repixl-theme') as Theme | null
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored)
      set({ theme: stored })
      return
    }
    // 2. Check OS preference
    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      document.documentElement.setAttribute('data-theme', 'light')
      set({ theme: 'light' })
      return
    }
    // 3. Default to dark
    document.documentElement.setAttribute('data-theme', 'dark')
    set({ theme: 'dark' })
  },
}))
