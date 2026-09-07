'use client'

import { create } from 'zustand'
import { authService, type AuthUser } from '@/lib/data/authService'
import {
  clearLegacyAccountStorage,
  setLogoutPreference,
} from '@/lib/browser-storage'

interface AuthState {
  authStatus: 'idle' | 'loading' | 'authenticated' | 'unauthenticated' | 'error'
  authError: string | null
  acceptSession: (user: AuthUser) => void
  refreshSession: () => Promise<void>
  isLoggedIn: boolean
  firstName: string
  lastName: string
  userEmail: string
  maskedPhone: string
  maskedDob: string
  hasPassword: boolean
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
  username: string | null
  gender: string | null
  avatarUrl: string | null
  createdAt: string | null
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
    username?: string | null,
    gender?: string | null,
    avatarUrl?: string | null
  ) => Promise<void>
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  hydrate: () => Promise<void>
  hydrateAdmin: () => Promise<void>
  isAdminSessionValid: () => Promise<boolean>
}

const LOGGED_OUT = {
  authStatus: 'unauthenticated' as const,
  authError: null,
  isLoggedIn: false,
  firstName: '',
  lastName: '',
  userEmail: '',
  maskedPhone: '—',
  maskedDob: '—',
  hasPassword: false,
  role: 'customer' as const,
  isSuperAdmin: false,
  username: null as string | null,
  gender: null as string | null,
  avatarUrl: null as string | null,
  createdAt: null as string | null,
}
// Prevent an older hydration response from overwriting a newer login/logout.
let authRevision = 0
let hydrationSequence = 0
function userState(user: AuthUser) {
  return {
    authStatus: 'authenticated' as const,
    authError: null,
    isLoggedIn: true,
    firstName: user.firstName,
    lastName: user.lastName,
    userEmail: user.email,
    maskedPhone: user.maskedPhone,
    maskedDob: user.maskedDob,
    hasPassword: user.hasPassword,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    username: user.username ?? null,
    gender: user.gender ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt ?? null,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  ...LOGGED_OUT,
  authStatus: 'idle',
  acceptSession: (user) => {
    ++authRevision
    setLogoutPreference(false)
    set(userState(user))
  },
  refreshSession: async () => {
    ++authRevision
    await get().hydrate()
  },
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
    get().acceptSession(result.user)
    return true
  },
  login: async (email, password) => {
    const revision = ++authRevision
    const result = await authService.login(email, password)
    if (revision !== authRevision) return false
    if (!result.ok || result.user.role !== 'customer') {
      set(LOGGED_OUT)
      if (!result.ok && result.mfaRequired && typeof window !== 'undefined') window.location.assign('/login/mfa')
      return false
    }
    get().acceptSession(result.user)
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
    get().acceptSession(result.user)
    return true
  },
  loginWithOAuth: async (email, firstName, lastName) => {
    const revision = ++authRevision
    const result = await authService.oauthLogin(email, firstName, lastName)
    if (revision !== authRevision) return
    if (!result.ok) {
      set(LOGGED_OUT)
      if (result.mfaRequired && typeof window !== 'undefined') { window.location.assign('/login/mfa'); return }
      throw new Error(result.error)
    }
    get().acceptSession(result.user)
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
  updateProfile: async (firstName, lastName, username, gender, avatarUrl) => {
    const revision = authRevision
    const user = await authService.updateProfile({
      firstName,
      lastName,
      username,
      gender,
      avatarUrl,
    }, get().role === 'customer' ? 'customer' : 'auto')
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
    const sequence = ++hydrationSequence
    if (!get().isLoggedIn) set({ authStatus: 'loading', authError: null })
    try {
      const user = await authService.me('customer')
      if (revision === authRevision && sequence === hydrationSequence)
        set(user?.role === 'customer' ? userState(user) : LOGGED_OUT)
    } catch {
      if (revision === authRevision && sequence === hydrationSequence)
        set({ authStatus: 'error', authError: 'Unable to verify your session. Please try again.' })
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
