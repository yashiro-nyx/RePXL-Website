import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { verifyAndConsumeMobileOAuthTicket } from '@/lib/mobile-oauth'
import { createMobileSession, mobileUserResponse } from '@/lib/mobile-auth'
import { primaryLogin } from '@/lib/mfa/service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  ticket: z.string().min(10),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { ticket } = parsed.data
    const payload = await verifyAndConsumeMobileOAuthTicket(ticket)
    if (!payload) {
      return errorResponse('Invalid or expired authorization ticket. Please try signing in again.', 400)
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    })
    if (!user || user.isArchived || user.role !== 'CUSTOMER') {
      return errorResponse('User account is invalid or no longer active.', 403)
    }

    // Check MFA challenge if customer has MFA enabled
    const primary = await primaryLogin(user.id, Date.now(), user.email)
    if (!primary.ok) return errorResponse(primary.error, primary.status)
    if (primary.challenge) {
      return successResponse({ mfaRequired: true, challenge: primary.challenge })
    }

    const tokens = await createMobileSession(user.id, {
      deviceName: request.headers.get('x-device-name') ?? 'Google Mobile Sign-In',
      platform: request.headers.get('x-platform') ?? 'expo',
    })

    return successResponse({
      mfaRequired: false,
      user: mobileUserResponse(user),
      tokens,
    })
  } catch (error) {
    console.error('Mobile Google exchange error:', error)
    return errorResponse('Internal server error', 500)
  }
}

