'use client'

import { create } from 'zustand'
import { authService, type AuthUser } from '@/lib/data/authService'

interface UserRecord {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
}

interface SessionData {
  email: string
  role: 'customer' | 'admin'
  loginAt: number // timestamp
  // Cached profile so offline hydrate can restore the session without the API.
  firstName?: string
  lastName?: string
  phone?: string
  isSuperAdmin?: boolean
}

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
  loginWithOAuth: (email: string, firstName: string, lastName: string) => Promise<void>
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  logoutAdmin: () => void
  updateProfile: (firstName: string, lastName: string, email: string, phone: string) => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  hydrate: () => Promise<void>
  hydrateAdmin: () => Promise<void>
  isAdminSessionValid: () => boolean
}

// Session timeout: 60 minutes for admin
const ADMIN_SESSION_TIMEOUT = 60 * 60 * 1000

// ─── localStorage helpers (session markers + offline user mirror) ───────────────

function getUsers(): UserRecord[] {
  try {
    const stored = localStorage.getItem('repixl-users')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveUsers(users: UserRecord[]) {
  localStorage.setItem('repixl-users', JSON.stringify(users))
}

/** Mirror an authenticated user into the local table so offline mode works. */
function mirrorUser(user: AuthUser, password?: string) {
  const users = getUsers()
  const idx = users.findIndex((u) => u.email === user.email)
  const rec: UserRecord = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: user.phone,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
    password: password ?? users[idx]?.password ?? '',
  }
  if (idx >= 0) users[idx] = rec
  else users.push(rec)
  saveUsers(users)
}

function writeSession(key: string, user: AuthUser) {
  const session: SessionData = {
    email: user.email,
    role: user.role,
    loginAt: Date.now(),
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    isSuperAdmin: user.isSuperAdmin,
  }
  localStorage.setItem(key, JSON.stringify(session))
}

function getCustomerSession(): SessionData | null {
  try {
    const legacy = localStorage.getItem('repixl-session')
    if (legacy) localStorage.removeItem('repixl-session')
    const s = localStorage.getItem('repixl-customer-session')
    if (!s) return null
    const data: SessionData = JSON.parse(s)
    if (data.role !== 'customer') return null
    return data
  } catch {
    return null
  }
}

function getAdminSession(): SessionData | null {
  try {
    const s = localStorage.getItem('repixl-admin-session')
    if (!s) return null
    const data: SessionData = JSON.parse(s)
    if (data.role !== 'admin') return null
    if (Date.now() - data.loginAt > ADMIN_SESSION_TIMEOUT) {
      localStorage.removeItem('repixl-admin-session')
      return null
    }
    return data
  } catch {
    return null
  }
}

function applyUser(
  set: (partial: Partial<AuthState>) => void,
  user: AuthUser
) {
  set({
    isLoggedIn: true,
    firstName: user.firstName,
    lastName: user.lastName,
    userEmail: user.email,
    userPhone: user.phone,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  })
}

const LOGGED_OUT: Partial<AuthState> = {
  isLoggedIn: false,
  firstName: '',
  lastName: '',
  userEmail: '',
  userPhone: '',
  role: 'customer',
  isSuperAdmin: false,
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  firstName: '',
  lastName: '',
  userEmail: '',
  userPhone: '',
  role: 'customer',
  isSuperAdmin: false,

  register: async (firstName, lastName, email, password) => {
    const result = await authService.register(firstName, lastName, email, password)
    if (!result.ok) return false
    // Clear any stale logout flag on new registration.
    localStorage.removeItem('repixl-oauth-logged-out')
    mirrorUser(result.user, password)
    writeSession('repixl-customer-session', result.user)
    applyUser(set, result.user)
    return true
  },

  login: async (email, password) => {
    const result = await authService.login(email, password)
    if (!result.ok) return false
    // API login accepts admins too, but the customer login page only wants
    // customers. Guard here to preserve prior behaviour.
    if (result.user.role !== 'customer') return false
    // Clear any stale logout flag so the OAuth sync hook is re-enabled.
    localStorage.removeItem('repixl-oauth-logged-out')
    mirrorUser(result.user, password)
    writeSession('repixl-customer-session', result.user)
    applyUser(set, result.user)
    return true
  },

  loginAdmin: async (email, password) => {
    const result = await authService.loginAdmin(email, password)
    if (!result.ok) return false
    mirrorUser(result.user, password)
    writeSession('repixl-admin-session', result.user)
    applyUser(set, result.user)
    return true
  },

  // OAuth login (Google) — calls the API to upsert user in DB and set the
  // HTTP-only session cookie, then falls back to localStorage-only if API is down.
  loginWithOAuth: async (email, firstName, lastName) => {
    const result = await authService.oauthLogin(email, firstName, lastName)
    const user = result.ok ? result.user : {
      email: email.toLowerCase(),
      firstName,
      lastName,
      phone: '',
      role: 'customer' as const,
      isSuperAdmin: false,
    }
    // Clear the logout flag so the OAuth sync hook is re-enabled for future
    // sessions (e.g. the user signs in again after having logged out).
    localStorage.removeItem('repixl-oauth-logged-out')
    mirrorUser(user, '')
    writeSession('repixl-customer-session', user)
    applyUser(set, user)
  },

  logout: () => {
    void authService.logout()
    localStorage.removeItem('repixl-customer-session')
    // Mark that the user explicitly logged out so the OAuth sync hook
    // doesn't re-authenticate them from the still-valid NextAuth JWT cookie.
    localStorage.setItem('repixl-oauth-logged-out', '1')
    set(LOGGED_OUT)
  },

  logoutAdmin: () => {
    void authService.logout()
    localStorage.removeItem('repixl-admin-session')
    set(LOGGED_OUT)
  },

  updateProfile: (firstName, lastName, email, phone) => {
    const previousEmail = get().userEmail
    const role = get().role
    const user: AuthUser = {
      email,
      firstName,
      lastName,
      phone,
      role,
      isSuperAdmin: get().isSuperAdmin,
    }
    void authService.updateProfile({ firstName, lastName, email, phone }, previousEmail)
    // Keep the local mirror + session in sync.
    const users = getUsers()
    saveUsers(
      users.map((u) => (u.email === previousEmail ? { ...u, firstName, lastName, email, phone } : u))
    )
    writeSession(role === 'admin' ? 'repixl-admin-session' : 'repixl-customer-session', user)
    set({ firstName, lastName, userEmail: email, userPhone: phone })
  },

  changePassword: async (oldPassword, newPassword) => {
    const email = get().userEmail
    const result = await authService.changePassword(email, oldPassword, newPassword)
    if (!result.ok) return false
    // Update local mirror password too so offline login still works.
    const users = getUsers()
    saveUsers(
      users.map((u) => (u.email === email ? { ...u, password: newPassword } : u))
    )
    return true
  },

  // Restore a customer session: prefer the live API session, else the local marker.
  hydrate: async () => {
    const apiUser = await authService.me()
    if (apiUser && apiUser.role === 'customer') {
      // Clear any stale logout flag — a valid server session means the user is
      // actively authenticated (e.g. they logged in again on another tab).
      localStorage.removeItem('repixl-oauth-logged-out')
      mirrorUser(apiUser)
      writeSession('repixl-customer-session', apiUser)
      applyUser(set, apiUser)
      return
    }

    // If the server session is gone, don't fall back to the localStorage marker
    // when the user has explicitly logged out. This prevents the OAuth sync hook
    // from writing a new localStorage session that gets picked up on the next
    // refresh.
    const loggedOut = localStorage.getItem('repixl-oauth-logged-out') === '1'
    if (loggedOut) {
      set(LOGGED_OUT)
      return
    }

    const session = getCustomerSession()
    if (!session) {
      set(LOGGED_OUT)
      return
    }
    // Use cached profile from the session marker, or the local user table.
    const users = getUsers()
    const rec = users.find((u) => u.email === session.email && u.role === 'customer')
    const user: AuthUser = {
      email: session.email,
      firstName: rec?.firstName ?? session.firstName ?? '',
      lastName: rec?.lastName ?? session.lastName ?? '',
      phone: rec?.phone ?? session.phone ?? '',
      role: 'customer',
      isSuperAdmin: false,
    }
    applyUser(set, user)
  },

  hydrateAdmin: async () => {
    const apiUser = await authService.me()
    if (apiUser && apiUser.role === 'admin') {
      mirrorUser(apiUser)
      writeSession('repixl-admin-session', apiUser)
      applyUser(set, apiUser)
      return
    }

    const session = getAdminSession()
    if (!session) {
      set(LOGGED_OUT)
      return
    }
    const users = getUsers()
    const rec = users.find((u) => u.email === session.email && u.role === 'admin')
    const user: AuthUser = {
      email: session.email,
      firstName: rec?.firstName ?? session.firstName ?? '',
      lastName: rec?.lastName ?? session.lastName ?? '',
      phone: rec?.phone ?? session.phone ?? '',
      role: 'admin',
      isSuperAdmin: rec?.isSuperAdmin ?? session.isSuperAdmin ?? false,
    }
    applyUser(set, user)
  },

  isAdminSessionValid: () => getAdminSession() !== null,
}))
