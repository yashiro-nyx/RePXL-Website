'use client'

import { apiClient, ApiClientError } from '@/lib/api-client'
import { clearLegacyAccountStorage } from '@/lib/browser-storage'

export interface ApiUser {
  id: string
  email: string
  firstName: string
  lastName: string
  maskedPhone?: string
  maskedDob?: string
  hasPassword?: boolean
  role: 'CUSTOMER' | 'ADMIN'
  isSuperAdmin: boolean
  username?: string | null
  gender?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

export interface AuthUser {
  id?: string
  email: string
  firstName: string
  lastName: string
  maskedPhone: string
  maskedDob: string
  hasPassword: boolean
  role: 'customer' | 'admin'
  isSuperAdmin: boolean
  username?: string | null
  gender?: string | null
  avatarUrl?: string | null
  createdAt?: string
}

function toAuthUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    maskedPhone: u.maskedPhone ?? '—',
    maskedDob: u.maskedDob ?? '—',
    hasPassword: u.hasPassword === true,
    role: u.role === 'ADMIN' ? 'admin' : 'customer',
    isSuperAdmin: u.isSuperAdmin,
    username: u.username ?? null,
    gender: u.gender ?? null,
    avatarUrl: u.avatarUrl ?? null,
    createdAt: u.createdAt,
  }
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string; notFound?: boolean; alreadyExists?: boolean; mfaRequired?: boolean }

async function authenticate(url: string, body: unknown): Promise<AuthResult> {
  clearLegacyAccountStorage()
  try {
    const data = await apiClient.post<ApiUser | {mfaRequired: true}>(url, body)
    if ('mfaRequired' in data) return {ok: false, error: 'Second factor required.', mfaRequired: true}
    return {ok: true, user: toAuthUser(data)}
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof ApiClientError && err.status < 500
          ? err.message
          : 'Unable to contact the server. Please try again.',
      notFound: err instanceof ApiClientError && err.status === 404,
      alreadyExists: err instanceof ApiClientError && err.status === 409,
    }
  }
}

export const authService = {
  login: (email: string, password: string) =>
    authenticate('/api/auth/login', { email, password }),
  async loginAdmin(email: string, password: string): Promise<AuthResult> {
    const result = await authenticate('/api/auth/login', { email, password })
    if (result.ok && result.user.role !== 'admin')
      return { ok: false, error: 'Admin access required.' }
    return result
  },
  register: (
    firstName: string,
    lastName: string,
    email: string,
    password: string
  ) =>
    authenticate('/api/auth/register', {
      firstName,
      lastName,
      email,
      password,
    }),
  oauthLoginOnly: (email: string, firstName: string, lastName: string) =>
    authenticate('/api/auth/oauth/login', { email, firstName, lastName }),
  oauthRegisterOnly: (email: string, firstName: string, lastName: string) =>
    authenticate('/api/auth/oauth/register', { email, firstName, lastName }),
  oauthLogin: (email: string, firstName: string, lastName: string) =>
    authenticate('/api/auth/oauth', { email, firstName, lastName }),
  async logout(): Promise<void> {
    await apiClient.post('/api/auth/logout')
  },
  async me(): Promise<AuthUser | null> {
    clearLegacyAccountStorage()
    try {
      return toAuthUser(await apiClient.get<ApiUser>('/api/auth/me'))
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) return null
      throw err
    }
  },
  async updateProfile(data: {
    firstName: string
    lastName: string
    username?: string | null
    gender?: string | null
    avatarUrl?: string | null
  }): Promise<AuthUser> {
    return toAuthUser(await apiClient.put<ApiUser>('/api/auth/me', data))
  },
  async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string
  ): Promise<AuthResult> {
    try {
      await apiClient.post('/api/auth/change-password', {
        oldPassword,
        newPassword,
      })
      return {
        ok: true,
        user: {
          email,
          firstName: '',
          lastName: '',
          maskedPhone: '—',
          maskedDob: '—',
          hasPassword: true,
          role: 'customer',
          isSuperAdmin: false,
        },
      }
    } catch (err) {
      return {
        ok: false,
        error:
          err instanceof ApiClientError
            ? err.message
            : 'Unable to change password. Please try again.',
      }
    }
  },
}
