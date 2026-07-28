'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useCompareStore } from '@/stores/compareStore'

interface CompareToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
  onDismiss: () => void
}

export function CompareToast({ message, type, visible, onDismiss }: CompareToastProps) {
  const slugs = useCompareStore((s) => s.slugs)

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div className="fixed bottom-6 left-1/2 z-[90] -translate-x-1/2 animate-[fadeSlideUp_0.3s_ease-out]" role="status" aria-live="polite">
      <div className={`flex items-center gap-3 rounded-lg border px-4 py-3 shadow-xl backdrop-blur-md ${
        type === 'success'
          ? 'border-repixl-success/30 bg-repixl-bg/95 text-repixl-text-light'
          : 'border-repixl-warning/30 bg-repixl-bg/95 text-repixl-warning'
      }`}>
        {type === 'success' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-warning"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></svg>
        )}
        <span className="text-sm">{message}</span>
        {type === 'success' && slugs.length > 0 && (
          <Link
            href={`/compare?items=${slugs.join(',')}`}
            className="ml-2 whitespace-nowrap text-xs font-medium text-repixl-red hover:underline"
          >
            View Comparison
          </Link>
        )}
      </div>
    </div>
  )
}
