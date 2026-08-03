'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface LoginErrors {
  email?: string
  password?: string
  auth?: string
}

// Hardcoded admin credentials (demo only)
const ADMIN_EMAIL = 'admin@repixl-admin.com'
const ADMIN_PASSWORD = 'RePIXL2026!'

export default function AdminLoginPage() {
  const [errors, setErrors] = useState<LoginErrors>({})
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()
  const { loginAdmin, isLoggedIn, role, hydrateAdmin } = useAuthStore()

  useEffect(() => { hydrateAdmin() }, [hydrateAdmin])

  useEffect(() => {
    if (isLoggedIn && role === 'admin') {
      router.push('/admin')
    }
  }, [isLoggedIn, role, router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors: LoginErrors = {}

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Enter a valid email address.'
    }
    if (!password.trim()) {
      newErrors.password = 'Password is required.'
    }
    if (!newErrors.email && !newErrors.password) {
      if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
        newErrors.auth = 'Invalid email or password.'
      }
    }

    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    // Seed admin account if it doesn't exist (first-time setup)
    const users = JSON.parse(localStorage.getItem('repixl-users') || '[]')
    const exists = users.some((u: any) => u.email === email)
    if (!exists && email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      users.push({ firstName: 'Admin', lastName: 'User', email, phone: '', password, role: 'admin', isSuperAdmin: true })
      localStorage.setItem('repixl-users', JSON.stringify(users))
    }

    // Try admin login
    const success = loginAdmin(email, password)
    if (!success) {
      setErrors({ auth: 'Invalid email or password.' })
      return
    }
    router.push('/admin')
  }

  return (
    <div className="burn-minimal flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-mono text-sm font-bold text-repixl-text-light">
            RePIXL <span className="text-repixl-red">Admin</span>
          </p>
        </div>

        <div className="rounded-lg border border-repixl-muted/20 bg-repixl-charcoal p-6 md:p-8">
          <h1 className="text-center font-mono text-lg font-semibold text-repixl-text-light">
            Admin Sign In
          </h1>
          <p className="mt-1 text-center text-xs text-repixl-muted">
            Access the store management dashboard.
          </p>

          {errors.auth && (
            <div className="mt-4 rounded border border-red-500/30 bg-repixl-red/10 px-3 py-2">
              <p className="text-xs text-repixl-red" role="alert">{errors.auth}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1 block text-xs text-repixl-muted">
                Admin Email
              </label>
              <input
                id="admin-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@repixl-admin.com"
                className={`w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:outline-none ${
                  errors.email || errors.auth
                    ? 'border-repixl-red/30 bg-repixl-red/10 focus:border-red-500'
                    : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-red/50'
                }`}
              />
              {errors.email && <p className="mt-1 text-xs text-repixl-red" role="alert">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="admin-password" className="mb-1 block text-xs text-repixl-muted">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:outline-none ${
                  errors.password || errors.auth
                    ? 'border-repixl-red/30 bg-repixl-red/10 focus:border-red-500'
                    : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-red/50'
                }`}
              />
              {errors.password && <p className="mt-1 text-xs text-repixl-red" role="alert">{errors.password}</p>}
            </div>

            <button
              type="submit"
              className="mt-2 w-full rounded bg-repixl-red py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/30"
            >
              Sign In to Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
