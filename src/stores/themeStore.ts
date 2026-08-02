'use client'

import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  hydrate: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isDark: true,

  toggle: () => {
    const newVal = !get().isDark
    localStorage.setItem('repixl-theme', newVal ? 'dark' : 'light')
    document.documentElement.classList.toggle('light', !newVal)
    document.documentElement.classList.toggle('dark', newVal)
    set({ isDark: newVal })
  },

  hydrate: () => {
    const stored = localStorage.getItem('repixl-theme')
    const isDark = stored !== 'light'
    document.documentElement.classList.toggle('light', !isDark)
    document.documentElement.classList.toggle('dark', isDark)
    set({ isDark })
  },
}))
