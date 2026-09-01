'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button, CornerBracket, PasswordInput } from '@/components/ui'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { authService } from '@/lib/data/authService'

interface LoginErrors {
  email?: string
  password?: string
}

// NextAuth error codes → human-readable (for unexpected OAuth failures)
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: 'There was a problem signing in with Google. Please try again.',
  OAuthCreateAccount: 'Could not create your account. Please try again.',
  OAuthAccountNotLinked: 'This email is already registered. Please sign in with your password.',
  AccessDenied: 'Access was denied. Please try again.',
  Configuration: 'Google sign-in is not configured. Please use email and password.',
  Default: 'Something went wrong with Google sign-in. Please try again.',
}

function LoginContent() {
  const [errors, setErrors] = useState<LoginErrors>({})
  const [oauthError, setOauthError] = useState('')
  const [oauthNotFound, setOauthNotFound] = useState(false) // email not in DB
  const [oauthLoading, setOauthLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: nextAuthSession, status: nextAuthStatus } = useSession()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)

  // ── Handle NextAuth ?error= redirects ──────────────────────────────────────
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) {
      setOauthError(OAUTH_ERROR_MESSAGES[error] ?? OAUTH_ERROR_MESSAGES.Default)
    }
  }, [searchParams])

  // ── Handle Google OAuth callback (?oauth=login) ─────────────────────────────
  // When SocialAuthButtons sends the user through Google with callbackUrl=/login?oauth=login,
  // NextAuth redirects back here with the JWT set. We detect that, read the
  // NextAuth session, and call POST /api/auth/oauth/login (login-only endpoint).
  useEffect(() => {
    const oauthMode = searchParams.get('oauth')
    if (oauthMode !== 'login') return
    if (nextAuthStatus !== 'authenticated') return
    if (!nextAuthSession?.user?.email) return

    // Already handled — don't re-run if the store already shows this user logged in
    const alreadyLoggedIn =
      useAuthStore.getState().isLoggedIn &&
      useAuthStore.getState().userEmail.toLowerCase() === nextAuthSession.user.email.toLowerCase()
    if (alreadyLoggedIn) {
      router.replace('/account')
      return
    }

    setOauthLoading(true)
    setOauthNotFound(false)
    setOauthError('')

    const nameParts = (nextAuthSession.user.name ?? '').split(' ')
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ')
    const email = nextAuthSession.user.email.toLowerCase()

    authService.oauthLoginOnly(email, firstName, lastName).then((result) => {
      if (result.ok) {
        // Sync the authenticated user into Zustand + localStorage
        const { loginWithOAuth } = useAuthStore.getState()
        // We already have the user from the API response — apply it directly
        // by using loginWithOAuth which will re-call oauthLogin (upsert, safe
        // since user exists). Alternatively apply state directly:
        localStorage.removeItem('repixl-oauth-logged-out')
        useAuthStore.setState({
          isLoggedIn: true,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          userEmail: result.user.email,
          userPhone: result.user.phone,
          role: result.user.role,
          isSuperAdmin: result.user.isSuperAdmin,
        })
        // Write localStorage session marker
        localStorage.setItem(
          'repixl-customer-session',
          JSON.stringify({
            email: result.user.email,
            role: result.user.role,
            loginAt: Date.now(),
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            phone: result.user.phone,
            isSuperAdmin: result.user.isSuperAdmin,
          })
        )
        // Mirror into users table
        const users: Array<Record<string, unknown>> = (() => {
          try { return JSON.parse(localStorage.getItem('repixl-users') ?? '[]') } catch { return [] }
        })()
        const idx = users.findIndex((u) => (u.email as string) === result.user.email)
        const rec = { ...result.user, password: '' }
        if (idx >= 0) users[idx] = rec; else users.push(rec)
        localStorage.setItem('repixl-users', JSON.stringify(users))

        addToast('Welcome back!')
        router.replace('/account')
      } else if ('notFound' in result && result.notFound) {
        setOauthNotFound(true)
      } else {
        setOauthError(result.error || 'Google sign-in failed. Please try again.')
      }
    }).finally(() => {
      setOauthLoading(false)
    })
  // Run when the NextAuth session becomes available after OAuth callback
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAuthStatus, nextAuthSession, searchParams])

  const validate = (): LoginErrors => {
    const form = formRef.current
    if (!form) return {}
    const get = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''
    const newErrors: LoginErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('login-email'))) {
      newErrors.email = 'Enter a valid email address.'
    }
    if (!get('login-password').trim()) {
      newErrors.password = 'Password is required.'
    }
    return newErrors
  }

  const focusFirstError = (errs: LoginErrors) => {
    const map: Record<string, string> = { email: 'login-email', password: 'login-password' }
    for (const key of Object.keys(errs) as (keyof LoginErrors)[]) {
      if (errs[key]) {
        (formRef.current?.querySelector(`#${map[key]}`) as HTMLInputElement)?.focus()
        break
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) { focusFirstError(newErrors); return }
    const form = formRef.current!
    const email = (form.querySelector('#login-email') as HTMLInputElement)?.value ?? ''
    const password = (form.querySelector('#login-password') as HTMLInputElement)?.value ?? ''
    const success = await login(email, password)
    if (!success) {
      setErrors({ email: 'Invalid email or password.' })
      return
    }
    addToast('Welcome back!')
    router.push('/account')
  }

  // While the OAuth callback is being processed, show a loading state
  if (oauthLoading) {
    return (
      <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <p className="text-sm text-repixl-muted">Signing in with Google…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePXL
              </span>
            </CornerBracket>
          </Link>
        </div>

        {/* NextAuth error banner */}
        {oauthError && !oauthNotFound && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-sm text-red-400">{oauthError}</p>
          </div>
        )}

        {/* Account-not-found banner (Google login, email not in DB) */}
        {oauthNotFound && (
          <div className="mb-4 rounded border border-amber-500/30 bg-amber-500/10 px-4 py-4">
            <p className="text-sm font-medium text-amber-300">Account not found.</p>
            <p className="mt-1 text-sm text-amber-300/80">
              No RePXL account is linked to this Google email. Please create an account first.
            </p>
            <Link
              href="/register"
              className="mt-3 inline-flex items-center gap-1.5 rounded bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              Create an account →
            </Link>
          </div>
        )}

        {/* Card */}
        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 md:p-8">
          <h1 className="text-center font-display text-display-sm text-repixl-text-light">
            Welcome back
          </h1>
          <p className="mt-1 text-center text-sm text-repixl-muted">
            Sign in to your account
          </p>

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div>
              <label htmlFor="login-email" className="mb-1 block text-xs text-repixl-text-light/70">
                Email Address
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                className={inputClass(errors.email)}
              />
              {errors.email && <p className="mt-1 text-xs text-red-400" role="alert">{errors.email}</p>}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="login-password" className="text-xs text-repixl-text-light/70">
                  Password
                </label>
                <Link href="/forgot-password" className="text-[10px] text-repixl-muted hover:text-repixl-text-light">
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="login-password"
                autoComplete="current-password"
                error={errors.password}
              />
              {errors.password && <p className="mt-1 text-xs text-red-400" role="alert">{errors.password}</p>}
            </div>

            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
              Log In
            </Button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-repixl-muted/20" />
            <span className="text-[10px] uppercase tracking-wider text-repixl-muted">or continue with</span>
            <span className="h-px flex-1 bg-repixl-muted/20" />
          </div>

          {/* Social login */}
          <SocialAuthButtons mode="login" />
        </div>

        <p className="mt-5 text-center text-sm text-repixl-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-repixl-text-light/80 underline hover:text-repixl-text-light">
            Register
          </Link>
        </p>
      </div>
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none ${
    error
      ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
      : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/50'
  }`
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center" />}>
      <LoginContent />
    </Suspense>
  )
}
