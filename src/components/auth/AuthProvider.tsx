'use client'

import { Suspense, useEffect } from 'react'
import { SessionProvider } from 'next-auth/react'
import { clearLegacyAccountStorage } from '@/lib/browser-storage'
import { useOAuthSync } from '@/hooks/useOAuthSync'

/**
 * Inner component — must be inside SessionProvider to call useSession().
 * Wrapped in Suspense because useOAuthSync uses useSearchParams() internally,
 * which requires a Suspense boundary in Next.js App Router.
 */
function OAuthSyncBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => { clearLegacyAccountStorage() }, [])
  useOAuthSync()
  return <>{children}</>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Suspense fallback={null}>
        <OAuthSyncBridge>{children}</OAuthSyncBridge>
      </Suspense>
    </SessionProvider>
  )
}
