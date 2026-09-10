import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { mobileUserResponse, refreshMobileSession } from '@/lib/mobile-auth'

const schema = z.object({ refreshToken: z.string().min(1) })
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)
  const result = await refreshMobileSession(parsed.data.refreshToken, {
    deviceName: request.headers.get('x-device-name') ?? undefined,
    platform: request.headers.get('x-platform') ?? undefined,
  })
  if (!result) return errorResponse('Refresh token is invalid or expired', 401)
  return successResponse({ user: mobileUserResponse(result.user), tokens: result.tokens })
}