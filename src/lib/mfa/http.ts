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

const DEVELOPMENT_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
])

function parsedOrigin(value: string | null | undefined) {
  if (!value) return null
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

export function sameOrigin(request: NextRequest) {
  const origin = parsedOrigin(request.headers.get('origin'))
  const requestOrigin = parsedOrigin(request.url)
  if (
    !origin ||
    !requestOrigin ||
    origin !== requestOrigin ||
    request.headers.get('sec-fetch-site') === 'cross-site'
  ) return false

  // Local development may use either documented port when another process has
  // 3000. Keep this explicit: no wildcard origins and no production fallback.
  if (process.env.NODE_ENV !== 'production' && DEVELOPMENT_ORIGINS.has(origin))
    return true

  // Production accepts only the configured canonical origin. Invalid URL
  // configuration fails closed instead of throwing an unhandled 500.
  const configuredOrigin = parsedOrigin(process.env.NEXTAUTH_URL)
  return configuredOrigin !== null && origin === configuredOrigin
}
export async function clearChallenge(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(CHALLENGE_COOKIE, '', {
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
    await clearSessionCookie()
    const cookieStore = await cookies()
    cookieStore.set(CHALLENGE_COOKIE, result.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 300,
    })
    return mfaResponse({ success: true, data: { mfaRequired: true } })
  }
  await clearChallenge()
  await setSessionCookie(result.user.id, result.proof!)
  const { id, email, firstName, lastName, role, isSuperAdmin } =
    result.user
  return mfaResponse({
    success: true,
    data: { id, email, firstName, lastName, role, isSuperAdmin, hasPassword: !!result.user.password },
  })
}
