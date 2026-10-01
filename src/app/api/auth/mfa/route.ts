import { NextRequest } from 'next/server'
import QRCode from 'qrcode'
import { z } from 'zod'
import {
  getCurrentUser,
  customerPrimaryAuthTime,
  customerMfaSessionVersion,
  setSessionCookie,
  requireRecentAuth,
} from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import { authenticator } from '@/lib/mfa/crypto'
import { manageMfa } from '@/lib/mfa/service'
import { mfaResponse, sameOrigin, securityEmail } from '@/lib/mfa/http'

export const dynamic = 'force-dynamic'
const schema = z.object({
  action: z.enum([
    'begin',
    'confirm',
    'acknowledge',
    'disable',
    'regenerate',
    'cancel',
  ]),
  code: z.string().max(128).optional(),
  saved: z.boolean().optional(),
})
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER')
      return mfaResponse(
        { success: false, error: 'Authentication required' },
        401
      )
    const [mfa, account] = await Promise.all([
      prisma.customerMfa.findUnique({
        where: { userId: user.id },
        select: {
          enabledAt: true,
          pendingExpiresAt: true,
          recoveryAcknowledged: true,
          recoveryHashes: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { password: true },
      }),
    ])
    return mfaResponse({
      success: true,
      data: {
        enabled: !!mfa?.enabledAt,
        setupPending:
          !mfa?.enabledAt &&
          !!mfa?.pendingExpiresAt &&
          mfa.pendingExpiresAt.getTime() > Date.now(),
        recoveryAcknowledged: mfa?.recoveryAcknowledged ?? false,
        recoveryRemaining: mfa?.recoveryHashes.length ?? 0,
        hasPassword: !!account?.password,
      },
    })
  } catch (error) {
    console.error('[mfa] request failed', error)
    return mfaResponse(
      { success: false, error: 'MFA is temporarily unavailable.' },
      503
    )
  }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request))
    return mfaResponse({ success: false, error: 'Invalid request origin' }, 403)
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'CUSTOMER')
      return mfaResponse(
        { success: false, error: 'Authentication required' },
        401
      )
    const input = schema.safeParse(await request.json())
    if (!input.success)
      return mfaResponse({ success: false, error: 'Invalid request' }, 400)

    // Sensitive mutations use one authoritative password-verification record.
    const RECENT_AUTH_REQUIRED_ACTIONS = ['begin', 'disable', 'regenerate'] as const
    if ((RECENT_AUTH_REQUIRED_ACTIONS as readonly string[]).includes(input.data.action)) {
      const account = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } })
      if (!account?.password) return mfaResponse({ success: false,
        error: 'Set a RePXL password before changing two-factor authentication.', code: 'PASSWORD_REQUIRED' }, 403)
      const recentAuthResult = await requireRecentAuth(user.id, 'password')
      if (recentAuthResult) {
        return mfaResponse(
          { success: false, error: 'Enter your current password to continue.', code: 'RECENT_AUTH_REQUIRED' },
          recentAuthResult.status
        )
      }
    }

    const primaryAt = await customerPrimaryAuthTime()
    const mfaVersion = await customerMfaSessionVersion()
    const result = await manageMfa(
      user.id,
      input.data.action,
      input.data,
      primaryAt,
      mfaVersion
    )
    if (!result.ok)
      return mfaResponse({ success: false, error: result.error }, result.status)
    if ('proof' in result && result.proof)
      await setSessionCookie(user.id, result.proof)
    if ('event' in result && result.event)
      await securityEmail(result.email, result.event)
    if ('recoveryUsed' in result && result.recoveryUsed && 'email' in result)
      await securityEmail(result.email, 'Recovery code used')
    if ('setup' in result && result.setup) {
      const uri = authenticator(
        result.setup.secret,
        result.setup.email
      ).toString()
      const qrCode = await QRCode.toDataURL(uri, { width: 256, margin: 2 })
      return mfaResponse({
        success: true,
        data: { secret: result.setup.secret, qrCode },
      })
    }
    return mfaResponse({
      success: true,
      data:
        'codes' in result ? { recoveryCodes: result.codes } : { updated: true },
    })
  } catch (error) {
    console.error('[mfa] request failed', error)
    return mfaResponse(
      {
        success: false,
        error: "We couldn't update two-factor authentication right now. Please try again.",
      },
      503
    )
  }
}
