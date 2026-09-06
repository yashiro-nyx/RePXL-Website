import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, setSessionCookie } from '@/lib/auth-helpers'
import { sendNotificationEmail } from '@/lib/mailer'
import { CHALLENGE_COOKIE, primaryLogin } from './service'

export function mfaResponse(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store', Pragma: 'no-cache' },
  })
}
export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin')
  const expected = new URL(process.env.NEXTAUTH_URL ?? request.url).origin
  return (
    origin === expected &&
    request.headers.get('sec-fetch-site') !== 'cross-site'
  )
}
export function clearChallenge() {
  cookies().set(CHALLENGE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  })
}
export async function securityEmail(email: string, event: string) {
  try {
    const result = await sendNotificationEmail(
      email,
      `RePIXL security: ${event}`,
      `${event} on your RePIXL account. If you did not make this change, contact RePIXL support immediately. Never share your authenticator or recovery codes.`
    )
    if (!result.ok) console.error('[mfa] Security email could not be delivered')
  } catch {
    console.error('[mfa] Security email could not be delivered')
  }
}
export async function customerLoginResponse(
  userId: string,
  primaryAt = Date.now(),
  expectedEmail?: string
) {
  const result = await primaryLogin(userId, primaryAt, expectedEmail)
  if (!result.ok)
    return mfaResponse({ success: false, error: result.error }, result.status)
  if (result.challenge) {
    clearSessionCookie()
    cookies().set(CHALLENGE_COOKIE, result.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    })
    return mfaResponse({ success: true, data: { mfaRequired: true } })
  }
  clearChallenge()
  setSessionCookie(result.user.id, result.proof!)
  const { id, email, firstName, lastName, role, isSuperAdmin } =
    result.user
  return mfaResponse({
    success: true,
    data: { id, email, firstName, lastName, role, isSuperAdmin, hasPassword: !!result.user.password },
  })
}
