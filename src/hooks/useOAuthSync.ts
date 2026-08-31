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
 */

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
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
