'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Redirect to the account dashboard Orders tab
export default function OrdersRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/account') }, [router])
  return null
}
