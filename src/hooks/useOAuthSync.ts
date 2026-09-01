'use client'

/**
 * Syncs a NextAuth Google/OAuth session into the Zustand authStore + database.
 *
 * Flow:
 * 1. NextAuth completes OAuth and sets its own JWT cookie.
 * 2. This hook detects the authenticated NextAuth session.
 * 3. Calls loginWithOAuth() which hits POST /api/auth/oauth to:
 *    a. Upsert the user in PostgreSQL.
 *    b. Set the HTTP-only session cookie (same as email/password login).
 *    c. Mirror the user into Zustand + localStorage.
 * 4. After the async login settles, redirect to /account.
 *
 * The redirect is only triggered when we're still on the /login or /register
 * page — if the user is already on another page (e.g. they refreshed), we just
 * sync the session state without navigating.
 *
 * Logout persistence fix:
 * When the user logs out, `authStore.logout()` writes a `repixl-oauth-logged-out`
 * flag to localStorage AND calls NextAuth `signOut` to clear the JWT cookie.
 * This hook checks for that flag first — if present, it skips re-syncing the
 * OAuth session. The flag is cleared on the next successful login.
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
  const synced = useRef(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return

    // ── Logout persistence guard ──────────────────────────────────────────────
    // If the user explicitly logged out, do NOT re-authenticate them from the
    // still-valid NextAuth JWT cookie. Instead, call NextAuth signOut to clear
    // the cookie so this condition won't trigger on future page loads.
    const loggedOut = typeof window !== 'undefined'
      ? localStorage.getItem('repixl-oauth-logged-out') === '1'
      : false

    if (loggedOut) {
      // Silently clear the NextAuth JWT cookie. `redirect: false` prevents a
      // page navigation; we just want the cookie gone so the status becomes
      // 'unauthenticated' on the next render.
      signOut({ redirect: false }).catch(() => { /* ignore */ })
      return
    }
    // ── End logout guard ──────────────────────────────────────────────────────

    const googleEmail = session.user.email.toLowerCase()

    // Already synced this mount, and the store already has this email — skip.
    if (synced.current && isLoggedIn && userEmail.toLowerCase() === googleEmail) return

    // Need to sync: either first time, or the store email doesn't match Google.
    if (!synced.current || !isLoggedIn || userEmail.toLowerCase() !== googleEmail) {
      synced.current = true
      const nameParts = (session.user.name ?? '').split(' ')
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ') ?? ''

      // loginWithOAuth is now async — upserts user in DB and sets the HTTP-only
      // session cookie before updating Zustand state.
      loginWithOAuth(googleEmail, firstName, lastName).then(() => {
        // Only redirect if we're on an auth page. If the user is already on
        // another page (e.g. they manually refreshed /account), stay put.
        if (pathname === '/login' || pathname === '/register') {
          router.push('/account')
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session])

  // Reset the sync flag when the NextAuth session ends so re-login works.
  useEffect(() => {
    if (status === 'unauthenticated') {
      synced.current = false
    }
  }, [status])
}
