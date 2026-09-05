'use client'

import { create } from 'zustand'
import { authService, type AuthUser } from '@/lib/data/authService'
import {
  clearLegacyAccountStorage,
  setLogoutPreference,
} from '@/lib/browser-storage'

interface AuthState {
  isLoggedIn: boolean
  firstName: string
  lastName: string
  userEmail: string
  userPhone: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
  login: (email: string, password: string) => Promise<boolean>
  loginAdmin: (email: string, password: string) => Promise<boolean>
  loginWithOAuth: (
    email: string,
    firstName: string,
    lastName: string
  ) => Promise<void>
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) => Promise<boolean>
  logout: () => Promise<void>
  logoutAdmin: () => Promise<void>
  updateProfile: (
    firstName: string,
    lastName: string,
    email: string,
    phone: string
  ) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  hydrate: () => Promise<void>
  hydrateAdmin: () => Promise<void>
  isAdminSessionValid: () => Promise<boolean>
}

const LOGGED_OUT = {
  isLoggedIn: false,
  firstName: '',
  lastName: '',
  userEmail: '',
  userPhone: '',
  role: 'customer' as const,
  isSuperAdmin: false,
}
// Prevent an older hydration response from overwriting a newer login/logout.
let authRevision = 0
function userState(user: AuthUser) {
  return {
    isLoggedIn: true,
    firstName: user.firstName,
    lastName: user.lastName,
    userEmail: user.email,
    userPhone: user.phone,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...LOGGED_OUT,
  register: async (firstName, lastName, email, password) => {
    const revision = ++authRevision
    const result = await authService.register(
      firstName,
      lastName,
      email,
      password
    )
    if (revision !== authRevision) return false
    if (!result.ok) {
      set(LOGGED_OUT)
      return false
    }
    setLogoutPreference(false)
    set(userState(result.user))
    return true
  },
  login: async (email, password) => {
    const revision = ++authRevision
    const result = await authService.login(email, password)
    if (revision !== authRevision) return false
    if (!result.ok || result.user.role !== 'customer') {
      set(LOGGED_OUT)
      return false
    }
    setLogoutPreference(false)
    set(userState(result.user))
    return true
  },
  loginAdmin: async (email, password) => {
    const revision = ++authRevision
    const result = await authService.loginAdmin(email, password)
    if (revision !== authRevision) return false
    if (!result.ok) {
      set(LOGGED_OUT)
      return false
    }
    setLogoutPreference(false)
    set(userState(result.user))
    return true
  },
  loginWithOAuth: async (email, firstName, lastName) => {
    const revision = ++authRevision
    const result = await authService.oauthLogin(email, firstName, lastName)
    if (revision !== authRevision) return
    if (!result.ok) {
      set(LOGGED_OUT)
      throw new Error(result.error)
    }
    setLogoutPreference(false)
    set(userState(result.user))
  },
  logout: async () => {
    ++authRevision
    setLogoutPreference(true)
    set(LOGGED_OUT)
    clearLegacyAccountStorage()
    await authService.logout()
  },
  logoutAdmin: async () => {
    await get().logout()
  },
  updateProfile: async (firstName, lastName, email, phone) => {
    const revision = authRevision
    const user = await authService.updateProfile({
      firstName,
      lastName,
      email,
      phone,
    })
    if (revision === authRevision) set(userState(user))
  },
  changePassword: async (oldPassword, newPassword) => {
    return (
      await authService.changePassword(
        get().userEmail,
        oldPassword,
        newPassword
      )
    ).ok
  },
  hydrate: async () => {
    const revision = authRevision
    try {
      const user = await authService.me()
      if (revision === authRevision)
        set(user?.role === 'customer' ? userState(user) : LOGGED_OUT)
    } catch {
      if (revision === authRevision) set(LOGGED_OUT)
    }
  },
  hydrateAdmin: async () => {
    const revision = authRevision
    try {
      const user = await authService.me()
      if (revision === authRevision)
        set(user?.role === 'admin' ? userState(user) : LOGGED_OUT)
    } catch {
      if (revision === authRevision) set(LOGGED_OUT)
    }
  },
  isAdminSessionValid: async () => {
    try {
      return (await authService.me())?.role === 'admin'
    } catch {
      return false
    }
  },
}))
