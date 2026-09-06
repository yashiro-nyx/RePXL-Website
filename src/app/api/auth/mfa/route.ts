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
  password: z.string().max(256).optional(),
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
  } catch {
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

    // Sensitive MFA mutations require recent re-authentication in addition to
    // the existing per-action password/primaryAt check inside manageMfa.
    const RECENT_AUTH_REQUIRED_ACTIONS = ['begin', 'disable', 'regenerate'] as const
    if ((RECENT_AUTH_REQUIRED_ACTIONS as readonly string[]).includes(input.data.action)) {
      const recentAuthResult = await requireRecentAuth(user.id)
      if (recentAuthResult) {
        return mfaResponse(
          { success: false, error: 'Recent authentication required.', code: 'RECENT_AUTH_REQUIRED' },
          recentAuthResult.status
        )
      }
    }

    const result = await manageMfa(
      user.id,
      input.data.action,
      input.data,
      customerPrimaryAuthTime(),
      customerMfaSessionVersion()
    )
    if (!result.ok)
      return mfaResponse({ success: false, error: result.error }, result.status)
    if ('proof' in result && result.proof)
      setSessionCookie(user.id, result.proof)
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
  } catch {
    return mfaResponse(
      {
        success: false,
        error: 'MFA is temporarily unavailable. Please retry.',
      },
      503
    )
  }
}
