'use client'

import { SessionProvider } from 'next-auth/react'
import { useOAuthSync } from '@/hooks/useOAuthSync'

/**
 * Inner component — must be inside SessionProvider to call useSession()
 */
function OAuthSyncBridge({ children }: { children: React.ReactNode }) {
  useOAuthSync()
  return <>{children}</>
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <OAuthSyncBridge>{children}</OAuthSyncBridge>
    </SessionProvider>
  )
}
