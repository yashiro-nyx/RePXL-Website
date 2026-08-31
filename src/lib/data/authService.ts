'use client'

// Auth data service: API-first (cookie sessions + Postgres users) with a
// localStorage user table as fallback when the API/DB is unavailable.

import { apiClient, ApiClientError } from '@/lib/api-client'
import { isInfrastructureError } from './fallback'

export interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: 'CUSTOMER' | 'ADMIN'
  isSuperAdmin: boolean
}

export interface AuthUser {
  id?: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    phone: u.phone ?? '',
    role: u.role === 'ADMIN' ? 'admin' : 'customer',
    isSuperAdmin: u.isSuperAdmin,
  }
}

// ─── localStorage user table (fallback) ─────────────────────────────────────────

interface LocalUserRecord {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
}

function getLocalUsers(): LocalUserRecord[] {
  try {
    const stored = localStorage.getItem('repixl-users')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveLocalUsers(users: LocalUserRecord[]) {
  localStorage.setItem('repixl-users', JSON.stringify(users))
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string }

export const authService = {
  /** Customer OR admin login. The API decides the role from the record. */
  async login(email: string, password: string): Promise<AuthResult> {
    try {
      const u = await apiClient.post<ApiUser>('/api/auth/login', { email, password })
      return { ok: true, user: toAuthUser(u) }
    } catch (err) {
      if (!isInfrastructureError(err)) {
        // Legitimate API rejection (bad credentials / archived).
        const msg = err instanceof ApiClientError ? err.message : 'Invalid credentials.'
        return { ok: false, error: msg }
      }
      // API/DB down → localStorage fallback.
      const users = getLocalUsers()
      const rec = users.find(
        (u) => u.email === email && u.password === password && u.role === 'customer'
      )
      if (!rec) return { ok: false, error: 'Invalid email or password.' }
      return { ok: true, user: recToAuthUser(rec) }
    }
  },

  async loginAdmin(email: string, password: string): Promise<AuthResult> {
    try {
      const u = await apiClient.post<ApiUser>('/api/auth/login', { email, password })
      if (u.role !== 'ADMIN') return { ok: false, error: 'Not an admin account.' }
      return { ok: true, user: toAuthUser(u) }
    } catch (err) {
      if (!isInfrastructureError(err)) {
        return { ok: false, error: 'Invalid admin credentials.' }
      }
      const users = getLocalUsers()
      const rec = users.find(
        (u) => u.email === email && u.password === password && u.role === 'admin'
      )
      if (!rec) return { ok: false, error: 'Invalid admin credentials.' }
      return { ok: true, user: recToAuthUser(rec) }
    }
  },

  async register(
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ): Promise<AuthResult> {
    try {
      const u = await apiClient.post<ApiUser>('/api/auth/register', {
        firstName,
        lastName,
        email,
        password,
      })
      return { ok: true, user: toAuthUser(u) }
    } catch (err) {
      if (!isInfrastructureError(err)) {
        const msg =
          err instanceof ApiClientError ? err.message : 'Registration failed.'
        return { ok: false, error: msg }
      }
      // Fallback: write to localStorage user table.
      const users = getLocalUsers()
      if (users.some((u) => u.email === email)) {
        return { ok: false, error: 'An account with this email already exists.' }
      }
      if (email.endsWith('@repixl-admin.com')) {
        return { ok: false, error: 'This email cannot be registered.' }
      }
      const rec: LocalUserRecord = {
        firstName,
        lastName,
        email,
        phone: '',
        password,
        role: 'customer',
        isSuperAdmin: false,
      }
      saveLocalUsers([...users, rec])
      return { ok: true, user: recToAuthUser(rec) }
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout')
    } catch {
      /* ignore — clearing local session is what matters */
    }
  },

  async me(): Promise<AuthUser | null> {
    try {
      const u = await apiClient.get<ApiUser>('/api/auth/me')
      return toAuthUser(u)
    } catch {
      return null
    }
  },

  async updateProfile(
    data: { firstName: string; lastName: string; email: string; phone: string },
    previousEmail?: string
  ): Promise<void> {
    try {
      await apiClient.put('/api/auth/me', data)
    } catch (err) {
      if (!isInfrastructureError(err)) throw err
      // Fallback: update local user table, matched on the prior email.
      const matchEmail = previousEmail ?? data.email
      const users = getLocalUsers()
      saveLocalUsers(
        users.map((u) => (u.email === matchEmail ? { ...u, ...data } : u))
      )
    }
  },

  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      await apiClient.post('/api/auth/change-password', { oldPassword, newPassword })
      return {
        ok: true,
        user: { email, firstName: '', lastName: '', phone: '', role: 'customer', isSuperAdmin: false },
      }
    } catch (err) {
      if (!isInfrastructureError(err)) {
        return { ok: false, error: 'Current password is incorrect.' }
      }
      // Fallback: verify + update in the local user table.
      const users = getLocalUsers()
      const rec = users.find((u) => u.email === email)
      if (!rec || rec.password !== oldPassword) {
        return { ok: false, error: 'Current password is incorrect.' }
      }
      saveLocalUsers(
        users.map((u) => (u.email === email ? { ...u, password: newPassword } : u))
      )
      return { ok: true, user: recToAuthUser(rec) }
    }
  },
}

function recToAuthUser(rec: LocalUserRecord): AuthUser {
  return {
    email: rec.email,
    firstName: rec.firstName,
    lastName: rec.lastName,
    phone: rec.phone,
    role: rec.role,
    isSuperAdmin: rec.isSuperAdmin,
  }
}
