'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Button, LegalModal, PasswordInput } from '@/components/ui'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { AuthLayout } from '@/components/auth/AuthLayout'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { authService } from '@/lib/data/authService'
import { termsContent, privacyContent } from '@/data/legal'
import { useFilteredInput, nameChars } from '@/hooks/useFilteredInput'

interface RegisterErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  agreeTerms?: string
}

const passwordRequirements = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /\d/.test(p) },
  { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
]

function isPasswordValid(p: string) { return passwordRequirements.every((r) => r.test(p)) }

function RegisterPage() {
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)
  const [oauthError, setOauthError] = useState('')
  const [oauthAlreadyExists, setOauthAlreadyExists] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: nextAuthSession, status: nextAuthStatus } = useSession()
  const register = useAuthStore((s) => s.register)
  const nameFilter = useFilteredInput(nameChars)

  useEffect(() => {
    const oauthMode = searchParams.get('oauth')
    if (oauthMode !== 'register') return
    if (nextAuthStatus !== 'authenticated') return
    if (!nextAuthSession?.user?.email) return

    const alreadyLoggedIn =
      useAuthStore.getState().isLoggedIn &&
      useAuthStore.getState().userEmail.toLowerCase() === nextAuthSession.user.email.toLowerCase()
    if (alreadyLoggedIn) { router.replace('/account'); return }

    setOauthLoading(true)
    setOauthAlreadyExists(false)
    setOauthError('')

    const nameParts = (nextAuthSession.user.name ?? '').split(' ')
    const email = nextAuthSession.user.email.toLowerCase()

    authService.oauthRegisterOnly(email, nameParts[0] ?? '', nameParts.slice(1).join(' ')).then((result) => {
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

        useToastStore.getState().addToast('Account created! Welcome to RePXL.')
        router.replace('/account')
      } else if ('alreadyExists' in result && result.alreadyExists) {
        setOauthAlreadyExists(true)
      } else {
        setOauthError(result.error || 'Google sign-up failed. Please try again.')
      }
    }).finally(() => setOauthLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextAuthStatus, nextAuthSession, searchParams])

  const validate = (): RegisterErrors => {
    const form = formRef.current
    if (!form) return {}
    const get = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''
    const errs: RegisterErrors = {}
    if (!get('reg-first').trim()) errs.firstName = 'First name is required.'
    if (!get('reg-last').trim()) errs.lastName = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('reg-email'))) errs.email = 'Enter a valid email address.'
    if (!isPasswordValid(password)) errs.password = 'Password does not meet all requirements.'
    if (get('reg-confirm') !== password) errs.confirmPassword = 'Passwords do not match.'
    if (!agreeTerms) errs.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) {
      const map: Record<string, string> = {
        firstName: 'reg-first', lastName: 'reg-last', email: 'reg-email',
        password: 'reg-password', confirmPassword: 'reg-confirm', agreeTerms: 'reg-agree',
      }
      for (const key of Object.keys(newErrors) as (keyof RegisterErrors)[]) {
        if (newErrors[key]) { (formRef.current?.querySelector(`#${map[key]}`) as HTMLInputElement)?.focus(); break }
      }
      return
    }
    const form = formRef.current!
    const firstName = (form.querySelector('#reg-first') as HTMLInputElement)?.value ?? ''
    const lastName = (form.querySelector('#reg-last') as HTMLInputElement)?.value ?? ''
    const email = (form.querySelector('#reg-email') as HTMLInputElement)?.value ?? ''
    const success = await register(firstName.trim(), lastName.trim(), email.trim(), password)
    if (!success) { setErrors((p) => ({ ...p, email: 'An account with this email already exists.' })); return }
    useToastStore.getState().addToast('Account created! Welcome to RePXL.')
    router.push('/account')
  }

  if (oauthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-repixl-bg">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-repixl-muted/20 bg-repixl-charcoal">
            <svg className="h-5 w-5 animate-spin text-repixl-red" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="font-mono text-xs uppercase tracking-widest text-repixl-muted">Creating your account…</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AuthLayout
      tagline="Join 2,400+ collectors who trust RePXL."
      subcopy="Create your account to start shopping condition-graded vintage cameras."
      cardCameraName="Fujifilm FinePix F30"
      cardCondition="excellent"
      cardYear="2006"
      cardMegapixels="6.3"
    >
      {/* OAuth banners */}
      {oauthError && !oauthAlreadyExists && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{oauthError}</p>
        </motion.div>
      )}
      {oauthAlreadyExists && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-4">
          <p className="text-sm font-semibold text-amber-300">Account already exists</p>
          <p className="mt-1 text-sm text-amber-300/80">A RePXL account is already linked to this Google email.</p>
          <Link href="/login" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-1.5 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30">
            Go to login →
          </Link>
        </motion.div>
      )}

      {/* Heading */}
      <div className="mb-7">
        <h1 className="font-display text-display-md text-repixl-text-light">Create an account</h1>
        <p className="mt-1.5 text-sm text-repixl-muted">Join the collector community.</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="reg-first" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">First Name</label>
            <input id="reg-first" type="text" autoComplete="given-name" className={inputClass(errors.firstName)} {...nameFilter} />
            {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
          </div>
          <div>
            <label htmlFor="reg-last" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">Last Name</label>
            <input id="reg-last" type="text" autoComplete="family-name" className={inputClass(errors.lastName)} {...nameFilter} />
            {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
          </div>
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">Email Address</label>
          <input id="reg-email" type="email" autoComplete="email" className={inputClass(errors.email)} />
          {errors.email && <FieldError>{errors.email}</FieldError>}
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">Password</label>
          <PasswordInput id="reg-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          {errors.password && <FieldError>{errors.password}</FieldError>}
          {/* Requirements */}
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
            {passwordRequirements.map((req) => {
              const met = req.test(password)
              return (
                <div key={req.label} className="flex items-center gap-1.5">
                  <div className={`h-1.5 w-1.5 flex-shrink-0 rounded-full transition-colors ${met ? 'bg-repixl-success' : 'bg-repixl-muted/30'}`} />
                  <span className={`text-[10px] leading-tight transition-colors ${met ? 'text-repixl-success' : 'text-repixl-muted/50'}`}>{req.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div>
          <label htmlFor="reg-confirm" className="mb-1.5 block text-xs font-medium text-repixl-text-light/70">Confirm Password</label>
          <PasswordInput id="reg-confirm" autoComplete="new-password" error={errors.confirmPassword} />
          {errors.confirmPassword && <FieldError>{errors.confirmPassword}</FieldError>}
        </div>

        <div>
          <div className="flex items-start gap-2.5">
            {/* Clicking the checkbox opens Terms modal — only checked after "I Agree" */}
            <button
              id="reg-agree"
              type="button"
              role="checkbox"
              aria-checked={agreeTerms}
              onClick={() => {
                if (!agreeTerms) {
                  setTermsModalOpen(true)
                } else {
                  setAgreeTerms(false)
                }
              }}
              className={`mt-0.5 flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/40 ${
                agreeTerms
                  ? 'border-repixl-red bg-repixl-red'
                  : 'border-repixl-muted/30 bg-repixl-bg'
              }`}
            >
              {agreeTerms && (
                <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              )}
            </button>
            <span className="text-[11px] leading-relaxed text-repixl-muted">
              I agree to the{' '}
              <button type="button" onClick={() => setTermsModalOpen(true)} className="text-repixl-text-light/80 underline underline-offset-2 hover:text-repixl-text-light">Terms of Service</button>
              {' '}and{' '}
              <button type="button" onClick={() => setPrivacyModalOpen(true)} className="text-repixl-text-light/80 underline underline-offset-2 hover:text-repixl-text-light">Privacy Policy</button>.
            </span>
          </div>
          {errors.agreeTerms && <FieldError>{errors.agreeTerms}</FieldError>}
        </div>

        <Button type="submit" variant="primary" size="lg" className="w-full">
          Create Account
        </Button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <span className="h-px flex-1 bg-repixl-muted/15" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted/60">or sign up with</span>
        <span className="h-px flex-1 bg-repixl-muted/15" />
      </div>

      <SocialAuthButtons mode="register" />

      <p className="mt-7 text-center text-sm text-repixl-muted">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-repixl-text-light underline underline-offset-2 transition-opacity hover:opacity-80">
          Log In
        </Link>
      </p>

      <LegalModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} title="Terms of Service" content={termsContent} onAgree={() => { setAgreeTerms(true) }} />
      <LegalModal isOpen={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} title="Privacy Policy" content={privacyContent} />
    </AuthLayout>
  )
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-400" role="alert">
      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {children}
    </p>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded-xl border px-4 py-3 text-sm text-repixl-text-light placeholder:text-repixl-muted/40 focus:outline-none transition-colors ${
    error
      ? 'border-red-400/60 bg-red-400/5 focus:border-red-400'
      : 'border-repixl-muted/15 bg-repixl-charcoal/60 focus:border-repixl-muted/40 focus:bg-repixl-charcoal'
  }`
}

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-repixl-bg" />}>
      <RegisterPage />
    </Suspense>
  )
}
