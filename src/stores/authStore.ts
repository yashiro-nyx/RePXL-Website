'use client'

import { create } from 'zustand'

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
}

interface AuthState {
  isLoggedIn: boolean
  firstName: string
  lastName: string
  userEmail: string
  userPhone: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
  login: (email: string, password: string) => boolean
  loginAdmin: (email: string, password: string) => boolean
  loginWithOAuth: (email: string, firstName: string, lastName: string) => void
  register: (firstName: string, lastName: string, email: string, password: string) => boolean
  logout: () => void
  logoutAdmin: () => void
  updateProfile: (firstName: string, lastName: string, email: string, phone: string) => void
  changePassword: (oldPassword: string, newPassword: string) => boolean
  hydrate: () => void
  hydrateAdmin: () => void
  isAdminSessionValid: () => boolean
}

// Session timeout: 60 minutes for admin
const ADMIN_SESSION_TIMEOUT = 60 * 60 * 1000

// Get all registered users from localStorage
function getUsers(): UserRecord[] {
  try {
    const stored = localStorage.getItem('repixl-users')
    return stored ? JSON.parse(stored) : []
  } catch { return [] }
}

function saveUsers(users: UserRecord[]) {
  localStorage.setItem('repixl-users', JSON.stringify(users))
}

function getCustomerSession(): SessionData | null {
  try {
    // Migrate old session format if present
    const legacy = localStorage.getItem('repixl-session')
    if (legacy) {
      localStorage.removeItem('repixl-session')
      // Don't migrate — force re-login for security
    }
    const s = localStorage.getItem('repixl-customer-session')
    if (!s) return null
    const data: SessionData = JSON.parse(s)
    if (data.role !== 'customer') return null
    return data
  } catch { return null }
}

function getAdminSession(): SessionData | null {
  try {
    const s = localStorage.getItem('repixl-admin-session')
    if (!s) return null
    const data: SessionData = JSON.parse(s)
    if (data.role !== 'admin') return null
    // Check expiry
    if (Date.now() - data.loginAt > ADMIN_SESSION_TIMEOUT) {
      localStorage.removeItem('repixl-admin-session')
      return null
    }
    return data
  } catch { return null }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isLoggedIn: false,
  firstName: '',
  lastName: '',
  userEmail: '',
  userPhone: '',
  role: 'customer',
  isSuperAdmin: false,

  register: (firstName, lastName, email, password) => {
    const users = getUsers()
    if (users.some((u) => u.email === email)) return false

    // Customers cannot register with admin emails
    if (email.endsWith('@repixl-admin.com')) return false

    const newUser: UserRecord = { firstName, lastName, email, phone: '', password, role: 'customer', isSuperAdmin: false }
    saveUsers([...users, newUser])

    const session: SessionData = { email, role: 'customer', loginAt: Date.now() }
    localStorage.setItem('repixl-customer-session', JSON.stringify(session))
    set({ isLoggedIn: true, firstName, lastName, userEmail: email, userPhone: '', role: 'customer', isSuperAdmin: false })
    return true
  },

  // Customer login — only authenticates customer accounts
  login: (email, password) => {
    const users = getUsers()
    const user = users.find((u) => u.email === email && u.password === password && u.role === 'customer')
    if (!user) return false

    const session: SessionData = { email, role: 'customer', loginAt: Date.now() }
    localStorage.setItem('repixl-customer-session', JSON.stringify(session))
    set({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      userPhone: user.phone,
      role: 'customer',
      isSuperAdmin: false,
    })
    return true
  },

  // Admin login — only authenticates admin accounts, uses separate session
  loginAdmin: (email, password) => {
    const users = getUsers()
    const user = users.find((u) => u.email === email && u.password === password && u.role === 'admin')
    if (!user) return false

    const session: SessionData = { email, role: 'admin', loginAt: Date.now() }
    localStorage.setItem('repixl-admin-session', JSON.stringify(session))
    set({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      userPhone: user.phone,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    })
    return true
  },

  // OAuth login (Google) — creates account if none exists, never touches password
  loginWithOAuth: (email: string, firstName: string, lastName: string) => {
    const users = getUsers()
    const existing = users.find((u) => u.email.toLowerCase() === email.toLowerCase())

    if (existing) {
      // Sign into existing account — do NOT overwrite password
      const session: SessionData = { email: existing.email, role: 'customer', loginAt: Date.now() }
      localStorage.setItem('repixl-customer-session', JSON.stringify(session))
      set({
        isLoggedIn: true,
        firstName: existing.firstName,
        lastName: existing.lastName,
        userEmail: existing.email,
        userPhone: existing.phone,
        role: 'customer',
        isSuperAdmin: false,
      })
    } else {
      // Create a new account (no password — OAuth only)
      const newUser: UserRecord = {
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone: '',
        password: '', // intentionally empty — cannot log in via password
        role: 'customer',
        isSuperAdmin: false,
      }
      saveUsers([...users, newUser])
      const session: SessionData = { email: email.toLowerCase(), role: 'customer', loginAt: Date.now() }
      localStorage.setItem('repixl-customer-session', JSON.stringify(session))
      set({
        isLoggedIn: true,
        firstName,
        lastName,
        userEmail: email.toLowerCase(),
        userPhone: '',
        role: 'customer',
        isSuperAdmin: false,
      })
    }
  },

  // Customer logout
  logout: () => {
    localStorage.removeItem('repixl-customer-session')
    set({ isLoggedIn: false, firstName: '', lastName: '', userEmail: '', userPhone: '', role: 'customer', isSuperAdmin: false })
  },

  // Admin logout
  logoutAdmin: () => {
    localStorage.removeItem('repixl-admin-session')
    set({ isLoggedIn: false, firstName: '', lastName: '', userEmail: '', userPhone: '', role: 'customer', isSuperAdmin: false })
  },

  updateProfile: (firstName, lastName, email, phone) => {
    const currentEmail = get().userEmail
    const users = getUsers()
    const updated = users.map((u) => u.email === currentEmail ? { ...u, firstName, lastName, email, phone } : u)
    saveUsers(updated)
    set({ firstName, lastName, userEmail: email, userPhone: phone })

    // Update the appropriate session
    const role = get().role
    const session: SessionData = { email, role, loginAt: Date.now() }
    if (role === 'admin') {
      localStorage.setItem('repixl-admin-session', JSON.stringify(session))
    } else {
      localStorage.setItem('repixl-customer-session', JSON.stringify(session))
    }
  },

  changePassword: (oldPassword, newPassword) => {
    const email = get().userEmail
    const users = getUsers()
    const user = users.find((u) => u.email === email)
    if (!user || user.password !== oldPassword) return false
    const updated = users.map((u) => u.email === email ? { ...u, password: newPassword } : u)
    saveUsers(updated)
    return true
  },

  // Hydrate for customer-facing pages — only reads customer session
  hydrate: () => {
    const session = getCustomerSession()
    if (!session) {
      // Clear state if no valid customer session
      set({ isLoggedIn: false, firstName: '', lastName: '', userEmail: '', userPhone: '', role: 'customer', isSuperAdmin: false })
      return
    }

    const users = getUsers()
    const user = users.find((u) => u.email === session.email && u.role === 'customer')
    if (!user) { localStorage.removeItem('repixl-customer-session'); return }

    set({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      userPhone: user.phone,
      role: 'customer',
      isSuperAdmin: false,
    })
  },

  // Hydrate for admin pages — only reads admin session
  hydrateAdmin: () => {
    const session = getAdminSession()
    if (!session) {
      set({ isLoggedIn: false, firstName: '', lastName: '', userEmail: '', userPhone: '', role: 'customer', isSuperAdmin: false })
      return
    }

    const users = getUsers()
    const user = users.find((u) => u.email === session.email && u.role === 'admin')
    if (!user) { localStorage.removeItem('repixl-admin-session'); return }

    set({
      isLoggedIn: true,
      firstName: user.firstName,
      lastName: user.lastName,
      userEmail: user.email,
      userPhone: user.phone,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    })
  },

  // Check if admin session is still valid (not expired)
  isAdminSessionValid: () => {
    const session = getAdminSession()
    return session !== null
  },
}))
