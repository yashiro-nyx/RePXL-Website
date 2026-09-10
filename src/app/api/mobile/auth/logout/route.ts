import { NextRequest } from 'next/server'
import { z } from 'zod'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { getMobileUser, revokeMobileSession } from '@/lib/mobile-auth'

const schema = z.object({ refreshToken: z.string().min(1) })
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  if (!(await getMobileUser(request))) return errorResponse('Unauthorized', 401)
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)
  await revokeMobileSession(parsed.data.refreshToken)
  return successResponse({ loggedOut: true })
}