'use client'

import Link from 'next/link'
import { SecurityGate } from '@/components/account/SecurityGate'
import { MfaSettings } from '@/components/account/MfaSettings'

export default function AccountMfaPage() {
  return (
    <SecurityGate>
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <Link
          href="/account/security"
          className="text-sm text-repixl-muted hover:text-repixl-text-light"
        >
          ← Security
        </Link>
        <h1 className="mt-4 font-display text-display-sm">
          Two-Factor Authentication
        </h1>
        <MfaSettings />
      </div>
    </SecurityGate>
  )
}
