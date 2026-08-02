'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button, CornerBracket, PasswordInput } from '@/components/ui'
import { SocialAuthButtons } from '@/components/auth/SocialAuthButtons'
import { useAuthStore } from '@/stores/authStore'

interface LoginErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const [errors, setErrors] = useState<LoginErrors>({})
  const formRef = useRef<HTMLFormElement>(null)
  const router = useRouter()
  const login = useAuthStore((s) => s.login)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const newErrors = validate()
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) { focusFirstError(newErrors); return }
    const form = formRef.current!
    const email = (form.querySelector('#login-email') as HTMLInputElement)?.value ?? ''
    const password = (form.querySelector('#login-password') as HTMLInputElement)?.value ?? ''
    const success = login(email, password)
    if (!success) {
      setErrors({ email: 'Invalid email or password.' })
      return
    }
    router.push('/account')
  }

  return (
    <div className="burn-subtle flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/">
            <CornerBracket size={8} color="rgba(245, 241, 236, 0.3)" className="mx-auto inline-block px-3 py-1.5">
              <span className="font-display text-xl font-semibold tracking-tight text-repixl-text-light">
                RePIXL
              </span>
            </CornerBracket>
          </Link>
        </div>

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
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/50'
  }`
}
