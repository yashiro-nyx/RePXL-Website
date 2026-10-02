'use client'

import { MfaSettings } from '@/components/account/MfaSettings'
import { PageBackLink } from '@/components/ui'

export default function AccountMfaPage() {
  return (
      <div className="rounded-xl border border-repixl-muted/10 bg-repixl-charcoal p-6">
        <PageBackLink href="/account/security" label="Security" />
        <h1 className="mt-4 font-display text-display-sm">
          Two-Factor Authentication
        </h1>
        <MfaSettings />
      </div>
  )
}
