'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { signIn, useSession } from 'next-auth/react'

function MobileGoogleBridgeContent() {
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [stage, setStage] = useState<'initiating' | 'authorizing' | 'completing' | 'error'>('initiating')
  const [statusMessage, setStatusMessage] = useState('Connecting to Google…')
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const hasTriggeredSignIn = useRef(false)
  const hasFinalized = useRef(false)

  const mode = (searchParams.get('mode') ?? 'auto') as 'login' | 'register' | 'auto'
  const clientRedirectUri = searchParams.get('redirect_uri') ?? 'repxl://auth/callback'

  // Step 1: If not yet signed into NextAuth, initiate Google sign-in
  useEffect(() => {
    if (status === 'unauthenticated' && !hasTriggeredSignIn.current) {
      hasTriggeredSignIn.current = true
      setStage('authorizing')
      setStatusMessage('Redirecting to Google Account selector…')
      const currentUrl = window.location.href
      void signIn('google', { callbackUrl: currentUrl })
    }
  }, [status])

  // Step 2: Once NextAuth session is established, exchange for mobile ticket
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !hasFinalized.current) {
      hasFinalized.current = true
      setStage('completing')
      setStatusMessage('Securing your RePXL session…')

      fetch('/api/mobile/auth/google/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      })
        .then(async (res) => {
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json?.success || !json?.data?.ticket) {
            const err = json?.error || 'Unable to complete Google authentication.'
            throw new Error(err)
          }

          const target = `${clientRedirectUri}${clientRedirectUri.includes('?') ? '&' : '?'}ticket=${encodeURIComponent(json.data.ticket)}`
          setRedirectUrl(target)
          setStatusMessage('Returning to RePXL app…')

          // Redirect back to app
          window.location.replace(target)
        })
        .catch((err: unknown) => {
          const message = err instanceof Error ? err.message : 'Google authentication failed.'
          setErrorMsg(message)
          setStage('error')
          const errorTarget = `${clientRedirectUri}${clientRedirectUri.includes('?') ? '&' : '?'}error=${encodeURIComponent(message)}`
          setRedirectUrl(errorTarget)

          // Auto return error to app
          window.location.replace(errorTarget)
        })
    }
  }, [status, session, mode, clientRedirectUri])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0d0d0d] px-6 text-center text-white">
      <div className="mb-6 flex items-center gap-1.5">
        <span className="border-2 border-white px-2.5 py-1 font-mono text-xl font-extrabold tracking-wider text-white">
          RePXL
        </span>
        <span className="h-2 w-2 rounded-full bg-[#c62828]" />
      </div>

      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#161618] p-8 shadow-2xl">
        {stage !== 'error' ? (
          <>
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#c62828]" />
            </div>
            <h2 className="font-display text-lg font-bold text-white">
              {mode === 'register' ? 'Setting up with Google' : 'Signing in with Google'}
            </h2>
            <p className="mt-2 text-xs text-neutral-400">{statusMessage}</p>
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="font-display text-base font-bold text-white">Authentication Failed</h2>
            <p className="mt-2 text-xs text-red-300/90">{errorMsg}</p>
          </>
        )}

        {redirectUrl && (
          <div className="mt-6 pt-4 border-t border-white/10">
            <a
              href={redirectUrl}
              className="inline-block w-full rounded-xl bg-[#c62828] py-3 text-xs font-bold text-white transition hover:bg-[#b71c1c]"
            >
              Tap here if not redirected automatically
            </a>
          </div>
        )}
      </div>

      <p className="mt-8 font-mono text-[11px] text-neutral-600">
        Secure single-sign-on bridge for RePXL mobile
      </p>
    </div>
  )
}

export default function MobileGoogleBridgePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0d0d0d] text-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#c62828]" />
        </div>
      }
    >
      <MobileGoogleBridgeContent />
    </Suspense>
  )
}

