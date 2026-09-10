import bcrypt from 'bcryptjs'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { loginSchema } from '@/lib/validations'
import { createMobileSession, mobileUserResponse } from '@/lib/mobile-auth'
import { primaryLogin } from '@/lib/mfa/service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const parsed = loginSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } })
  if (!user || user.isArchived || user.role !== 'CUSTOMER') {
    return errorResponse('Invalid email or password', 401)
  }
  if (!(await bcrypt.compare(parsed.data.password, user.password))) {
    return errorResponse('Invalid email or password', 401)
  }

  const primary = await primaryLogin(user.id, Date.now(), user.email)
  if (!primary.ok) return errorResponse(primary.error, primary.status)
  if (primary.challenge) {
    return successResponse({ mfaRequired: true, challenge: primary.challenge })
  }

  const tokens = await createMobileSession(user.id, {
    deviceName: request.headers.get('x-device-name') ?? undefined,
    platform: request.headers.get('x-platform') ?? undefined,
  })
  return successResponse({
    mfaRequired: false,
    user: mobileUserResponse(user),
    tokens,
  })
}