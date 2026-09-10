import { NextRequest } from 'next/server'
import { successResponse, errorResponse } from '@/lib/api'
import { getMobileUser, mobileUserResponse } from '@/lib/mobile-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return errorResponse('Unauthorized', 401)
  return successResponse(mobileUserResponse(user))
}