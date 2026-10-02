import { afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sameOrigin } from './http'

function request(url: string, origin: string, site = 'same-origin') {
  return new NextRequest(url, {
    method: 'POST',
    headers: { Origin: origin, 'Sec-Fetch-Site': site },
  })
}

afterEach(() => vi.unstubAllEnvs())

describe('MFA same-origin validation', () => {
  it.each(['http://localhost:3000', 'http://localhost:3001'])(
    'accepts the explicit development origin %s when request host matches',
    (origin) => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
      expect(sameOrigin(request(`${origin}/api/auth/recent-auth`, origin))).toBe(true)
    }
  )

  it('rejects cross-port, cross-site, and unlisted development origins', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXTAUTH_URL', 'http://localhost:3000')
    expect(sameOrigin(request('http://localhost:3001/api/auth/recent-auth', 'http://localhost:3000'))).toBe(false)
    expect(sameOrigin(request('http://localhost:3001/api/auth/recent-auth', 'http://localhost:3001', 'cross-site'))).toBe(false)
    expect(sameOrigin(request('http://localhost:3002/api/auth/recent-auth', 'http://localhost:3002'))).toBe(false)
  })

  it('accepts only the configured production origin', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://repxlph.vercel.app')
    expect(sameOrigin(request('https://repxlph.vercel.app/api/auth/recent-auth', 'https://repxlph.vercel.app'))).toBe(true)
    expect(sameOrigin(request('https://repxlph.vercel.app/api/auth/recent-auth', 'http://localhost:3000'))).toBe(false)
  })

  it('fails closed without throwing when production NEXTAUTH_URL is malformed', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'repxlph.vercel.app')
    expect(() => sameOrigin(request('https://repxlph.vercel.app/api/auth/recent-auth', 'https://repxlph.vercel.app'))).not.toThrow()
    expect(sameOrigin(request('https://repxlph.vercel.app/api/auth/recent-auth', 'https://repxlph.vercel.app'))).toBe(false)
  })
})
