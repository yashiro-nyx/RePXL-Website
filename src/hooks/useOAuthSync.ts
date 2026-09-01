'use client'

/**
 * Syncs a NextAuth Google/OAuth session into the Zustand authStore + database.
 *
 * Flow:
 * 1. User clicks "Continue with Google" → NextAuth opens the Google consent screen.
 * 2. Google authenticates and redirects back to /api/auth/callback/google.
 * 3. NextAuth sets its JWT cookie and redirects to callbackUrl (/login).
 * 4. On /login, useOAuthSync detects status === 'authenticated'.
 * 5. Calls loginWithOAuth() which hits POST /api/auth/oauth to:
 *    a. Upsert the user in PostgreSQL.
 *    b. Set the HTTP-only repixl-session-token cookie.
 *    c. Mirror the user into Zustand + localStorage.
 * 6. After loginWithOAuth resolves, redirects to /account.
 *
 * Why callbackUrl points to /login (not /account):
 * If we redirect straight to /account, there is a race between:
 *   - Navbar's hydrate() call (which finds no repixl-session-token yet and
 *     may call set(LOGGED_OUT))
 *   - loginWithOAuth() setting the session cookie and Zustand state
 * By landing on /login first and doing the sync there before navigating,
 * we ensure the session is fully established before the user sees /account.
 *
 * Logout persistence:
 * logout() writes repixl-oauth-logged-out to localStorage and calls NextAuth
 * signOut to clear the JWT. This hook checks that flag before syncing so a
 * logged-out user is never re-authenticated from a stale JWT.
 */

import { useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export function useOAuthSync() {
  const { data: session, status } = useSession()
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const userEmail = useAuthStore((s) => s.userEmail)

  // pendingRef: prevents multiple concurrent loginWithOAuth calls for the same session
  const pendingRef = useRef(false)
  // syncedEmailRef: tracks which Google email we've already synced so we don't
  // repeat on every render while staying on the same page
  const syncedEmailRef = useRef<string | null>(null)

  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Not authenticated yet — nothing to do
    if (status !== 'authenticated' || !session?.user?.email) return

    // ── Logout persistence guard ──────────────────────────────────────────────
    // If the user explicitly logged out, do NOT re-authenticate them from the
    // still-valid NextAuth JWT. Clear the JWT cookie and bail out.
    const loggedOut =
      typeof window !== 'undefined' &&
      localStorage.getItem('repixl-oauth-logged-out') === '1'

    if (loggedOut) {
      signOut({ redirect: false }).catch(() => { /* non-critical */ })
      return
    }
    // ── End logout guard ──────────────────────────────────────────────────────

    const googleEmail = session.user.email.toLowerCase()

    // Already synced this email on this mount AND the store reflects it — skip.
    if (
      syncedEmailRef.current === googleEmail &&
      isLoggedIn &&
      userEmail.toLowerCase() === googleEmail
    ) {
      return
    }

    // Another loginWithOAuth call is already in-flight — skip to avoid duplicates.
    if (pendingRef.current) return

    pendingRef.current = true
    syncedEmailRef.current = googleEmail

    const nameParts = (session.user.name ?? '').split(' ')
    const firstName = nameParts[0] ?? ''
    const lastName = nameParts.slice(1).join(' ')

    loginWithOAuth(googleEmail, firstName, lastName)
      .then(() => {
        // Only navigate away from auth pages. On other pages (e.g. the user
        // refreshed /account), stay put — the store is already updated.
        if (pathname === '/login' || pathname === '/register') {
          router.push('/account')
        }
      })
      .catch(() => {
        // loginWithOAuth already has a fallback path — this catch is a safety net
        syncedEmailRef.current = null
      })
      .finally(() => {
        pendingRef.current = false
      })

  // We intentionally depend on status+session (the OAuth session data) and
  // pathname. isLoggedIn/userEmail are read inside the effect for the guard
  // check but we don't want them to re-trigger the effect (that would cause
  // the sync to re-run every time Zustand state changes).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, pathname])

  // Reset tracking refs when the NextAuth session ends so a fresh login works.
  useEffect(() => {
    if (status === 'unauthenticated') {
      pendingRef.current = false
      syncedEmailRef.current = null
    }
  }, [status])
}
