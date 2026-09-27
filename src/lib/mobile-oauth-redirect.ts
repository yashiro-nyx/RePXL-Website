export const MOBILE_OAUTH_CALLBACK = 'repxl://auth/callback'

export function isMobileOAuthCallback(value: string): boolean {
  // Only the registered app callback may receive a session ticket.
  return value === MOBILE_OAUTH_CALLBACK
}

export function oauthErrorDestination(callback: string | undefined, origin: string, error: string): string {
  if (callback) {
    try {
      const url = new URL(callback, origin)
      if (url.origin === origin && url.pathname === '/auth/mobile-google' &&
          isMobileOAuthCallback(url.searchParams.get('redirect_uri') ?? MOBILE_OAUTH_CALLBACK)) {
        url.searchParams.set('error', error)
        return url.pathname + url.search
      }
    } catch { /* Fall back to the website login page. */ }
  }
  return `/login?error=${encodeURIComponent(error)}`
}
