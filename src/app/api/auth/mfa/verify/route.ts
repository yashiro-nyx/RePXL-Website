import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { setSessionCookie } from '@/lib/auth-helpers'
import { CHALLENGE_COOKIE, completeChallenge } from '@/lib/mfa/service'
import {
  clearChallenge,
  mfaResponse,
  sameOrigin,
  securityEmail,
} from '@/lib/mfa/http'

export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return mfaResponse({ success: false, error: 'Invalid request origin' }, 403)
  try {
    const parsed = z
      .object({ code: z.string().min(1).max(128) })
      .safeParse(await request.json())
    if (!parsed.success)
      return mfaResponse(
        { success: false, error: 'Authentication could not be verified.' },
        400
      )
    const result = await completeChallenge(
      cookies().get(CHALLENGE_COOKIE)?.value ?? '',
      parsed.data.code.trim()
    )
    if (!result.ok)
      return mfaResponse({ success: false, error: result.error }, result.status)
    clearChallenge()
    setSessionCookie(result.user.id, result.proof)
    if (result.recoveryUsed)
      await securityEmail(result.user.email, 'Recovery code used')
    return mfaResponse({ success: true, data: { authenticated: true } })
  } catch {
    return mfaResponse(
      { success: false, error: 'Authentication is temporarily unavailable.' },
      503
    )
  }
}
