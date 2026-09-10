import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { completeChallenge } from '@/lib/mfa/service'
import { createMobileSession, mobileUserResponse } from '@/lib/mobile-auth'

const schema = z.object({
  challenge: z.string().min(1),
  code: z.string().min(1).max(128),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const result = await completeChallenge(parsed.data.challenge, parsed.data.code.trim())
  if (!result.ok) return errorResponse(result.error, result.status)

  const tokens = await createMobileSession(result.user.id, {
    deviceName: request.headers.get('x-device-name') ?? undefined,
    platform: request.headers.get('x-platform') ?? undefined,
  })
  return successResponse({
    user: mobileUserResponse(result.user),
    tokens,
    recoveryUsed: result.recoveryUsed,
  })
}