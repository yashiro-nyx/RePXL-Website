'use client'

import { SecurityGate } from '@/components/account/SecurityGate'
import SecurityOverview from '@/components/account/SecurityOverview'

export default function SecurityPage() {
  return (
    <SecurityGate>
      <SecurityOverview />
    </SecurityGate>
  )
}
