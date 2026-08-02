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

interface AuthState {
  isLoggedIn: boolean
  firstName: string
  lastName: string
  userEmail: string
  userPhone: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
  login: (email: string, password: string) => boolean
  register: (firstName: string, lastName: string, email: string, password: string) => boolean
  logout: () => void
  updateProfile: (firstName: string, lastName: string, email: string, phone: string) => void
  changePassword: (oldPassword: string, newPassword: string) => boolean
  hydrate: () => void
}

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

function getSession(): { email: string } | null {
  try {
    const s = localStorage.getItem('repixl-session')
    return s ? JSON.parse(s) : null
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
    if (users.some((u) => u.email === email)) return false // already exists

    const role: 'admin' | 'customer' = email.endsWith('@repixl-admin.com') ? 'admin' : 'customer'
    const isSuperAdmin = email === 'super@repixl-admin.com' || email === 'admin@repixl-admin.com'

    const newUser: UserRecord = { firstName, lastName, email, phone: '', password, role, isSuperAdmin }
    saveUsers([...users, newUser])
    localStorage.setItem('repixl-session', JSON.stringify({ email }))
    set({ isLoggedIn: true, firstName, lastName, userEmail: email, userPhone: '', role, isSuperAdmin })
    return true
  },

  login: (email, password) => {
    const users = getUsers()
    const user = users.find((u) => u.email === email && u.password === password)
    if (!user) return false

    localStorage.setItem('repixl-session', JSON.stringify({ email }))
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

  logout: () => {
    // Only clear the session — do NOT clear per-user data (cart/wishlist/compare)
    // so it persists when the user logs back in
    localStorage.removeItem('repixl-session')
    set({ isLoggedIn: false, firstName: '', lastName: '', userEmail: '', userPhone: '', role: 'customer', isSuperAdmin: false })
  },

  updateProfile: (firstName, lastName, email, phone) => {
    const currentEmail = get().userEmail
    const users = getUsers()
    const updated = users.map((u) => u.email === currentEmail ? { ...u, firstName, lastName, email, phone } : u)
    saveUsers(updated)
    set({ firstName, lastName, userEmail: email, userPhone: phone })
    // Update session if email changed
    localStorage.setItem('repixl-session', JSON.stringify({ email }))
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

  hydrate: () => {
    const session = getSession()
    if (!session) return

    const users = getUsers()
    const user = users.find((u) => u.email === session.email)
    if (!user) { localStorage.removeItem('repixl-session'); return }

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
}))
