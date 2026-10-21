'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MOBILE_APP_RELEASE } from '@/lib/mobile-download'

const STORAGE_KEY = 'repxl_mobile_banner_dismissed'

export function MobileAppBanner() {
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    try {
      const isDismissed = sessionStorage.getItem(STORAGE_KEY) === 'true'
      if (!isDismissed) {
        setDismissed(false)
      }
    } catch {
      // In case storage is inaccessible
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem(STORAGE_KEY, 'true')
    } catch {
      // Ignore
    }
  }

  if (dismissed) return null

  return (
    <aside
      aria-label="Download mobile app banner"
      className="relative z-40 border-b border-repixl-red/30 bg-gradient-to-r from-repixl-charcoal via-repixl-bg to-repixl-charcoal px-4 py-2.5 text-xs md:hidden"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-repixl-red text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
              <path d="M12 18h.01" />
            </svg>
          </div>
          <div className="min-w-0 truncate">
            <span className="font-semibold text-repixl-text-light">RePXL on Android</span>
            <span className="mx-1.5 text-repixl-muted/60">•</span>
            <span className="text-repixl-muted">v{MOBILE_APP_RELEASE.version} APK</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/download"
            className="rounded-lg bg-repixl-red px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-white hover:bg-red-700"
          >
            Get App
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-repixl-muted hover:text-repixl-text-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-repixl-red"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

