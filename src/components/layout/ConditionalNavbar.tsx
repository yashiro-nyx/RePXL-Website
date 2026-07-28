'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from './Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Hide the customer navbar on all admin routes
  if (pathname.startsWith('/admin')) return null

  return <Navbar />
}
