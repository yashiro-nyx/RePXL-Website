'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, CornerBracket, LegalModal, PasswordInput } from '@/components/ui'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useAuthStore } from '@/stores/authStore'
import { useToastStore } from '@/stores/toastStore'
import { termsContent, privacyContent } from '@/data/legal'

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

function isPasswordValid(password: string): boolean {
  return passwordRequirements.every((req) => req.test(password))
}

export default function RegisterPage() {
  const [errors, setErrors] = useState<RegisterErrors>({})
  const [password, setPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [termsModalOpen, setTermsModalOpen] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const register = useAuthStore((s) => s.register)

  const validate = (): RegisterErrors => {
    const form = formRef.current
    if (!form) return {}
    const get = (id: string) => (form.querySelector(`#${id}`) as HTMLInputElement)?.value ?? ''
    const newErrors: RegisterErrors = {}

    if (!get('reg-first').trim()) newErrors.firstName = 'First name is required.'
    if (!get('reg-last').trim()) newErrors.lastName = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('reg-email'))) newErrors.email = 'Enter a valid email address.'
    if (!isPasswordValid(password)) newErrors.password = 'Password does not meet all requirements.'
    if (get('reg-confirm') !== password) newErrors.confirmPassword = 'Passwords do not match.'
    if (!agreeTerms) newErrors.agreeTerms = 'You must agree to the Terms of Service and Privacy Policy.'

    return newErrors
  }

  const focusFirstError = (errs: RegisterErrors) => {
    const map: Record<string, string> = {
      firstName: 'reg-first', lastName: 'reg-last', email: 'reg-email',
      password: 'reg-password', confirmPassword: 'reg-confirm', agreeTerms: 'reg-agree',
    }
    for (const key of Object.keys(errs) as (keyof RegisterErrors)[]) {
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
    const firstName = (form.querySelector('#reg-first') as HTMLInputElement)?.value ?? ''
    const lastName = (form.querySelector('#reg-last') as HTMLInputElement)?.value ?? ''
    const email = (form.querySelector('#reg-email') as HTMLInputElement)?.value ?? ''
    const success = await register(firstName.trim(), lastName.trim(), email.trim(), password)
    if (!success) {
      setErrors((prev) => ({ ...prev, email: 'An account with this email already exists.' }))
      return
    }
    useToastStore.getState().addToast('Account created! Welcome to RePXL.')
    router.push('/account')
  }

  return (
    <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">RePXL</span>
            </CornerBracket>
          </Link>
        </div>

        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6 md:p-8">
          <h1 className="text-center font-display text-display-sm text-repixl-text-light">Create an account</h1>
          <p className="mt-1 text-center text-sm text-repixl-muted">Join the collector community</p>

          <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="reg-first" className="mb-1 block text-xs text-repixl-text-light/70">First Name</label>
                <input id="reg-first" type="text" autoComplete="given-name" className={inputClass(errors.firstName)} />
                {errors.firstName && <p className="mt-1 text-xs text-red-400" role="alert">{errors.firstName}</p>}
              </div>
              <div>
                <label htmlFor="reg-last" className="mb-1 block text-xs text-repixl-text-light/70">Last Name</label>
                <input id="reg-last" type="text" autoComplete="family-name" className={inputClass(errors.lastName)} />
                {errors.lastName && <p className="mt-1 text-xs text-red-400" role="alert">{errors.lastName}</p>}
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="mb-1 block text-xs text-repixl-text-light/70">Email Address</label>
              <input id="reg-email" type="email" autoComplete="email" className={inputClass(errors.email)} />
              {errors.email && <p className="mt-1 text-xs text-red-400" role="alert">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="reg-password" className="mb-1 block text-xs text-repixl-text-light/70">Password</label>
              <PasswordInput id="reg-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
              {errors.password && <p className="mt-1 text-xs text-red-400" role="alert">{errors.password}</p>}
              <ul className="mt-2.5 space-y-1" aria-label="Password requirements">
                {passwordRequirements.map((req) => {
                  const met = req.test(password)
                  return (
                    <li key={req.label} className="flex items-center gap-2">
                      {met ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><circle cx="12" cy="12" r="10" /></svg>
                      )}
                      <span className={`text-[11px] ${met ? 'text-repixl-success' : 'text-repixl-muted/60'}`}>{req.label}</span>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div>
              <label htmlFor="reg-confirm" className="mb-1 block text-xs text-repixl-text-light/70">Confirm Password</label>
              <PasswordInput id="reg-confirm" autoComplete="new-password" error={errors.confirmPassword} />
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-400" role="alert">{errors.confirmPassword}</p>}
            </div>

            <div>
              <label className="flex cursor-pointer items-start gap-2">
                <input id="reg-agree" type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-bg text-repixl-red focus:ring-repixl-red/30" />
                <span className="text-[11px] leading-tight text-repixl-muted">
                  I agree to the{' '}
                  <button type="button" onClick={() => setTermsModalOpen(true)} className="text-repixl-text-light/80 underline hover:text-repixl-text-light">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" onClick={() => setPrivacyModalOpen(true)} className="text-repixl-text-light/80 underline hover:text-repixl-text-light">Privacy Policy</button>.
                </span>
              </label>
              {errors.agreeTerms && <p className="mt-1 text-xs text-red-400" role="alert">{errors.agreeTerms}</p>}
            </div>

            <Button type="submit" variant="primary" size="lg" className="mt-2 w-full">Register</Button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-repixl-muted/20" />
            <span className="text-[10px] uppercase tracking-wider text-repixl-muted">or sign up with</span>
            <span className="h-px flex-1 bg-repixl-muted/20" />
          </div>

          {/* Social signup */}
          <SocialAuthButtons mode="register" />
        </div>

        <p className="mt-5 text-center text-sm text-repixl-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-repixl-text-light/80 underline hover:text-repixl-text-light">Log In</Link>
        </p>

        <LegalModal isOpen={termsModalOpen} onClose={() => setTermsModalOpen(false)} title="Terms of Service" content={termsContent} onAgree={() => setAgreeTerms(true)} />
        <LegalModal isOpen={privacyModalOpen} onClose={() => setPrivacyModalOpen(false)} title="Privacy Policy" content={privacyContent} />
      </div>
    </div>
  )
}

function inputClass(error?: string): string {
  return `w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/50'
  }`
}
