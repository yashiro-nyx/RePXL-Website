'use client'

import SecurityOverview from '@/components/account/SecurityOverview'

// The Security OVERVIEW is view-only (status + links) and must NOT trigger
// step-up verification just to open it — so it is intentionally NOT wrapped in
// the identity-verification gate. The sensitive sub-pages
// (/account/security/password and /account/security/mfa) remain gated, and
// their APIs independently enforce recent-auth server-side.
export default function SecurityPage() {
  return <SecurityOverview />
}
