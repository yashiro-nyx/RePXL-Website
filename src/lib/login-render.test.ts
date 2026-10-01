import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ status: 'unauthenticated' }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('oauth=login'),
}))
vi.mock('next-auth/react', () => ({
  useSession: () => ({ status: auth.status, data: auth.status === 'authenticated' ? { user: { email: 'test@example.test' } } : null }),
  signIn: vi.fn(),
}))
vi.mock('@/stores/authStore', () => ({ useAuthStore: (selector: any) => selector({ login: vi.fn() }) }))
vi.mock('@/stores/toastStore', () => ({ useToastStore: (selector: any) => selector({ addToast: vi.fn() }) }))
vi.mock('@/lib/data/authService', () => ({ authService: { oauthLoginOnly: vi.fn() } }))
// Isolate unrelated UI barrel exports; real AuthLayout, Motion, LoginPage and
// SocialAuthButtons still render. No effects/hydration or browser JS is needed.
vi.mock('@/components/ui', () => ({
  Button: ({ children }: any) => React.createElement('button', null, children),
  PasswordInput: ({ id }: any) => React.createElement('input', { id, type: 'password' }),
  CornerBracket: ({ children }: any) => React.createElement('div', null, children),
}))
import LoginPage from '@/app/(auth)/login/page'
import { OtpInput } from '@/components/ui/OtpInput'

describe('login rendering without hydration', () => {
  it.each(['unauthenticated', 'loading', 'authenticated'])('oauth=login remains visible while session is %s', (status) => {
    auth.status = status
    const html = renderToStaticMarkup(React.createElement(LoginPage))
    expect(html).toContain('Welcome back')
    expect(html).toContain('login-email')
    expect(html).toContain('login-password')
    expect(html).toContain('with Google')
    // A missing login chunk must not leave the essential form at opacity zero.
    expect(html.slice(0, html.indexOf('Welcome back'))).not.toMatch(/opacity:0(?:[;" ])/)
  })
  it('renders six accessible numeric boxes with visible validation semantics', () => {
    const html = renderToStaticMarkup(React.createElement(OtpInput, { value: '', onChange: () => {}, error: true }))
    expect(html.match(/<input /g)).toHaveLength(6)
    expect(html.match(/aria-invalid="true"/g)).toHaveLength(6)
    expect(html).toContain('aria-label="6-digit verification code"')
    expect(html).toContain('autoComplete="one-time-code"')
    expect(html).toContain('inputMode="numeric"')
  })
})
