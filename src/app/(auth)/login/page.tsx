'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Button, CornerBracket, PasswordInput } from '@/components/ui'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { authService } from '@/lib/data/authService'

interface LoginErrors {
  email?: string
  password?: string
}

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
  const [oauthNotFound, setOauthNotFound] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: nextAuthSession, status: nextAuthStatus } = useSession()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)

  // Handle NextAuth ?error= redirects
  useEffect(() => {
    const error = searchParams.get('error')
    if (error) setOauthError(OAUTH_ERROR_MESSAGES[error] ?? OAUTH_ERROR_MESSAGES.Default)
  }, [searchParams])

  // Handle Google OAuth callback (?oauth=login)
  useEffect(() => {
    const oauthMode = searchParams.get('oauth')
    if (oauthMode !== 'login') return
    if (nextAuthStatus !== 'authenticated') return
    if (!nextAuthSession?.user?.email) return

    const alreadyLoggedIn =
      useAuthStore.getState().isLoggedIn &&
      useAuthStore.getState().userEmail.toLowerCase() === nextAuthSession.user.email.toLowerCase()
    if (alreadyLoggedIn) { router.replace('/account'); return }

    setOauthLoading(true)
    setOauthNotFound(false)
    setOauthError('')

    const nameParts = (nextAuthSession.user.name ?? '').split(' ')
    const email = nextAuthSession.user.email.toLowerCase()

    authService.oauthLoginOnly(email, nameParts[0] ?? '', nameParts.slice(1).join(' ')).then((result) => {
      if (result.ok) {
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
        localStorage.setItem('repixl-customer-session', JSON.stringify({
          email: result.user.email, role: result.user.role, loginAt: Date.now(),
          firstName: result.user.firstName, lastName: result.user.lastName,
          phone: result.user.phone, isSuperAdmin: result.user.isSuperAdmin,
        }))
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
    }).finally(() => setOauthLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAuthStatus, nextAuthSession, searchParams])

  const validate = (): LoginErrors => {
    const form = formRef.current
    if (!form) return {}
    const get = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''
    const errs: LoginErrors = {}
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('login-email'))) errs.email = 'Enter a valid email address.'
    if (!get('login-password').trim()) errs.password = 'Password is required.'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const map: Record<string, string> = { email: 'login-email', password: 'login-password' }
      for (const key of Object.keys(newErrors) as (keyof LoginErrors)[]) {
        if (newErrors[key]) { (formRef.current?.querySelector(`#${map[key]}`) as HTMLInputElement)?.focus(); break }
      }
      return
    }
    const form = formRef.current!
    const email = (form.querySelector('#login-email') as HTMLInputElement)?.value ?? ''
    const password = (form.querySelector('#login-password') as HTMLInputElement)?.value ?? ''
    const success = await login(email, password)
    if (!success) { setErrors({ email: 'Invalid email or password.' }); return }
    addToast('Welcome back!')
    router.push('/account')
  }

  // OAuth loading screen
  if (oauthLoading) {
    return (
      <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-repixl-muted/20 bg-repixl-charcoal">
            <svg className="h-5 w-5 animate-spin text-repixl-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-repixl-muted">Signing in with Google…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="burn-subtle flex min-h-screen items-center justify-center px-4 py-12">
      {/* Atmospheric background watermark */}
      <div className="pointer-events-none fixed inset-0 -z-10 flex select-none items-center justify-center overflow-hidden" aria-hidden="true">
        <span
          className="font-display font-bold uppercase leading-none text-white/[0.025]"
          style={{ fontSize: 'clamp(10rem, 20vw, 22rem)', letterSpacing: '-0.03em' }}
        >
          SIGN IN
        </span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" aria-label="Go to RePXL home">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5 transition-opacity hover:opacity-80">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePXL
              </span>
            </CornerBracket>
          </Link>
        </div>

        {/* OAuth error banners */}
        {oauthError && !oauthNotFound && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3"
          >
            <p className="text-sm text-red-400">{oauthError}</p>
          </motion.div>
        )}

        {/* Account-not-found banner */}
        {oauthNotFound && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-4"
          >
            <p className="text-sm font-medium text-amber-300">Account not found.</p>
            <p className="mt-1 text-sm text-amber-300/80">
              No RePXL account is linked to this Google email.
            </p>
            <Link
              href="/register"
              className="mt-3 inline-flex items-center gap-1.5 rounded bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
            >
              Create an account →
            </Link>
          </motion.div>
        )}

        {/* Card */}
        <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal shadow-2xl shadow-black/40">
          {/* Card header */}
          <div className="border-b border-repixl-muted/10 px-6 py-5 md:px-8">
            <h1 className="font-display text-display-sm text-repixl-text-light">Welcome back</h1>
            <p className="mt-1 text-sm text-repixl-muted">Sign in to your account to continue.</p>
          </div>

          <div className="px-6 py-6 md:px-8">
            <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="login-email" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">
                  Email Address
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  className={inputClass(errors.email)}
                />
                {errors.email && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-medium text-repixl-text-light/70">
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted transition-colors hover:text-repixl-text-light"
                  >
                    Forgot?
                  </Link>
                </div>
                <PasswordInput
                  id="login-password"
                  autoComplete="current-password"
                  error={errors.password}
                />
                {errors.password && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-red-400" role="alert">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    {errors.password}
                  </p>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">
                Log In
              </Button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-repixl-muted/15" aria-hidden="true" />
              <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted/70">
                or continue with
              </span>
              <span className="h-px flex-1 bg-repixl-muted/15" aria-hidden="true" />
            </div>

            <SocialAuthButtons mode="login" />
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-repixl-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-medium text-repixl-text-light/90 underline underline-offset-2 transition-colors hover:text-repixl-text-light">
            Register
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded-lg border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none transition-colors ${
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
