'use client'

/**
 * Syncs a NextAuth Google/OAuth session into the Zustand authStore.
 * Call this once near the root of the app (inside AuthProvider).
 *
 * Flow:
 *  1. NextAuth completes the OAuth redirect and sets a JWT cookie.
 *  2. useSession() returns the authenticated session.
 *  3. This hook detects the session and calls loginWithOAuth(), which
 *     creates or finds the user in localStorage and sets repixl-customer-session.
 *  4. The Zustand store is now in sync → Navbar, /account, etc. work normally.
 */

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/stores/authStore'

export function useOAuthSync() {
  const { data: session, status } = useSession()
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth)
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const synced = useRef(false)

  useEffect(() => {
    // Only run once per session — when NextAuth says "authenticated"
    // and the local store doesn't already have a session
    if (
      status === 'authenticated' &&
      session?.user?.email &&
      !isLoggedIn &&
      !synced.current
    ) {
      synced.current = true
      const email = session.user.email
      const nameParts = (session.user.name ?? '').split(' ')
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ') ?? ''
      loginWithOAuth(email, firstName, lastName)
    }

    // Reset the ref when the NextAuth session ends
    if (status === 'unauthenticated') {
      synced.current = false
    }
  }, [status, session, isLoggedIn, loginWithOAuth])
}
