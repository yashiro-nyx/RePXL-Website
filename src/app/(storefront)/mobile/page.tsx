import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

/**
 * Convenience redirect: /mobile -> /download
 */
export default function MobileRedirectPage() {
  redirect('/download')
}

