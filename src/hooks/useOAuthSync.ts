'use client'

/**
 * Syncs a NextAuth Google/OAuth session into the Zustand authStore.
 *
 * Bug fixed: Previously checked only !isLoggedIn, which allowed a stale
 * localStorage session (different email) to block the OAuth sync. Now compares
 * the NextAuth session email against the current store email and forces a sync
 * whenever they don't match — ensuring the Google-authenticated email always wins.
 */

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useAuthStore } from '@/stores/authStore'

export function useOAuthSync() {
  const { data: session, status } = useSession()
  const loginWithOAuth = useAuthStore((s) => s.loginWithOAuth)
  const userEmail = useAuthStore((s) => s.userEmail)
  const synced = useRef(false)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) return

    const googleEmail = session.user.email.toLowerCase()

    // Sync if:
    // 1. Not yet synced this session AND
    // 2. Either not logged in, OR logged in with a DIFFERENT email than Google returned
    const mismatch = userEmail && userEmail.toLowerCase() !== googleEmail
    const notSynced = !synced.current

    if (notSynced && (mismatch || !userEmail)) {
      synced.current = true
      const nameParts = (session.user.name ?? '').split(' ')
      const firstName = nameParts[0] ?? ''
      const lastName = nameParts.slice(1).join(' ') ?? ''
      loginWithOAuth(googleEmail, firstName, lastName)
    }
  }, [status, session, userEmail, loginWithOAuth])

  // Reset the ref when the NextAuth session ends so re-login works
  useEffect(() => {
    if (status === 'unauthenticated') {
      synced.current = false
    }
  }, [status])
}
