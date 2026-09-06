import { clearChallenge } from '@/lib/mfa/http'
import { successResponse, errorResponse } from '@/lib/api'
import { clearSessionCookie, clearAdminSessionCookie, clearRecentAuthCookie } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    clearChallenge()
    clearSessionCookie()
    clearAdminSessionCookie()
    clearRecentAuthCookie()
    return successResponse({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout error:', error)
    return errorResponse('Internal server error', 500)
  }
}
