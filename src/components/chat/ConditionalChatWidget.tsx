'use client'

import { usePathname } from 'next/navigation'
import { ChatWidget } from './ChatWidget'

/**
 * Mounts the floating AI Concierge chat widget on the customer storefront only.
 *
 * Hidden on:
 *  - Admin routes (`/admin/*`) — admin has its own tooling; the concierge is a
 *    customer support surface.
 *  - Authentication routes (`/login`, `/register`, `/forgot-password`,
 *    `/reset-password`, `/login/mfa`) — keep those focused, no floating overlay.
 *  - Payment-processing/result pages (`/checkout/success`, `/checkout/processing`)
 *    — avoid covering the confirmation UI.
 *
 * It intentionally remains available on the rest of the storefront (including the
 * checkout form step) so shoppers can ask questions while browsing/buying.
 */
const HIDDEN_PREFIXES = [
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/checkout/success',
  '/checkout/processing',
]

export function ConditionalChatWidget() {
  const pathname = usePathname()
  if (!pathname) return null
  const path = pathname.toLowerCase()
  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return null
  return <ChatWidget />
}
