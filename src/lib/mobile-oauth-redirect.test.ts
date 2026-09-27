import { describe, expect, it } from 'vitest'
import { isMobileOAuthCallback, MOBILE_OAUTH_CALLBACK, oauthErrorDestination } from './mobile-oauth-redirect'

describe('mobile OAuth return destinations', () => {
  const origin = 'https://repxl.example'
  const bridge = `/auth/mobile-google?mode=auto&redirect_uri=${encodeURIComponent(MOBILE_OAUTH_CALLBACK)}`

  it('returns provider errors to the mobile bridge with its callback intact', () => {
    const result = new URL(oauthErrorDestination(origin + bridge, origin, 'OAuthCallback'), origin)
    expect(result.pathname).toBe('/auth/mobile-google')
    expect(result.searchParams.get('redirect_uri')).toBe(MOBILE_OAUTH_CALLBACK)
    expect(result.searchParams.get('mode')).toBe('auto')
    expect(result.searchParams.get('error')).toBe('OAuthCallback')
  })

  it.each([undefined, '/login?oauth=login', 'https://other.example' + bridge, 'not a URL',
    '/auth/mobile-google?redirect_uri=https://other.example',
  ])('keeps web or invalid callbacks on the website login page: %s', (callback) => {
    expect(oauthErrorDestination(callback, origin, 'AccessDenied')).toBe('/login?error=AccessDenied')
  })

  it.each(['https://other.example', 'javascript:alert(1)', 'repxl://other/callback',
    'repxl://auth/callback?ticket=attacker', 'exp://127.0.0.1:8081/--/auth/callback',
  ])('does not send session tickets to an unsupported destination: %s', (callback) => {
    expect(isMobileOAuthCallback(callback)).toBe(false)
  })

  it('accepts the registered app callback', () => {
    expect(isMobileOAuthCallback(MOBILE_OAUTH_CALLBACK)).toBe(true)
  })
})
