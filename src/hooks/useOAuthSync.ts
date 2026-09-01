'use client'

/**
 * useOAuthSync — Session-refresh bridge for already-authenticated OAuth users.
 *
 * This hook handles ONE specific scenario:
 *   A user who previously logged in via Google refreshes a page. Their NextAuth
 *   JWT is still valid but the repixl-session-token HTTP-only cookie may have
 *   expired (7-day TTL vs 30-day JWT). In that case, hydrate() won't find a
 *   server session and would leave the user in a logged-out state.
 *
 * What this hook does NOT do:
 *   - It does NOT handle first-time Google login. That is handled on /login via
 *     ?oauth=login landing and calling POST /api/auth/oauth/login.
 *   - It does NOT handle first-time Google registration. That is handled on
 *     /register via ?oauth=register landing and calling POST /api/auth/oauth/register.
 *   - It does NOT run on /login or /register pages while a fresh OAuth callback
 *     is in progress (those pages detect ?oauth=* and handle it themselves).
 *
 * Logout persistence:
 *   When the user logs out, logout() writes repixl-oauth-logged-out to
 *   localStorage AND calls NextAuth signOut. This hook checks that flag and
 *   skips re-syncing so a logged-out user is never auto-restored from a stale JWT.
 */

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useSearchParams } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export function useOAuthSync() {
  const { data: session, status } = useSession()
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const userEmail = useAuthStore((s) => s.userEmail)

  const pendingRef = useRef(false)
  const syncedEmailRef = useRef<string | null>(null)

  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return

    // ── Logout persistence guard ──────────────────────────────────────────────
    const loggedOut =
      typeof window !== 'undefined' &&
      localStorage.getItem('repixl-oauth-logged-out') === '1'

    if (loggedOut) {
      // Clear the NextAuth JWT so this guard doesn't fire on every future mount.
      signOut({ redirect: false }).catch(() => { /* non-critical */ })
      return
    }

    // ── Skip during active OAuth callback ────────────────────────────────────
    // If the page has ?oauth=login or ?oauth=register, the login/register page
    // is handling the OAuth callback itself. Don't interfere.
    const oauthParam = searchParams.get('oauth')
    if (oauthParam === 'login' || oauthParam === 'register') return

    // Also skip on auth pages entirely — they manage their own flow.
    if (pathname === '/login' || pathname === '/register') return
    // ── End skip ──────────────────────────────────────────────────────────────

    const googleEmail = session.user.email.toLowerCase()

    // Already synced and store reflects it — nothing to do.
    if (
      syncedEmailRef.current === googleEmail &&
      isLoggedIn &&
      userEmail.toLowerCase() === googleEmail
    ) {
      return
    }

    // Store already knows this user (e.g. they logged in via email/password,
    // not Google). Don't overwrite.
    if (isLoggedIn && userEmail.toLowerCase() !== googleEmail) return

    // Another call is in-flight.
    if (pendingRef.current) return

    pendingRef.current = true
    syncedEmailRef.current = googleEmail

    const nameParts = (session.user.name ?? '').split(' ')
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ')

    // Use the generic upsert endpoint for refresh — the user already exists
    // (they logged in or registered via Google earlier), so this is safe.
    loginWithOAuth(googleEmail, firstName, lastName)
      .catch(() => {
        syncedEmailRef.current = null
      })
      .finally(() => {
        pendingRef.current = false
      })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, pathname, searchParams])

  useEffect(() => {
    if (status === 'unauthenticated') {
      pendingRef.current = false
      syncedEmailRef.current = null
    }
  }, [status])
}
