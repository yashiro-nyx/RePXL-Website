'use client'

import { SecurityGate } from '@/components/account/SecurityGate'
import PasswordPanel from '@/components/account/PasswordPanel'

export default function SecurityPasswordPage() {
  return (
    <SecurityGate>
      <PasswordPanel />
    </SecurityGate>
  )
}
