'use client'

import { create } from 'zustand'

export interface Toast {
  id: string
  message: string
  type: 'success' | 'error' | 'info'
  /** Optional action shown as a button inside the toast */
  action?: {
    label: string
    href: string
  }
  /** How long (ms) the toast lives — defaults to 4500 */
  duration: number
  /** Timestamp when the toast was created — used to drive the progress bar */
  createdAt: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (
    message: string,
    type?: Toast['type'],
    action?: Toast['action'],
    duration?: number
  ) => void
  removeToast: (id: string) => void
}

const DEFAULT_DURATION = 4500

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],

  addToast: (message, type = 'success', action, duration = DEFAULT_DURATION) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const toast: Toast = { id, message, type, action, duration, createdAt: Date.now() }
    set({ toasts: [...get().toasts, toast] })
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) })
    }, duration)
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))
