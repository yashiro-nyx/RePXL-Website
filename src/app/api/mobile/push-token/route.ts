import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { successResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'

const tokenSchema = z.object({
  token: z.string().min(10).max(512),
  platform: z.string().max(30).optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  const parsed = tokenSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)

  const token = await prisma.pushToken.upsert({
    where: { token: parsed.data.token },
    create: { userId: user.id, token: parsed.data.token, platform: parsed.data.platform },
    update: { userId: user.id, platform: parsed.data.platform, lastUsedAt: new Date() },
  })
  return successResponse({ id: token.id, registered: true })
}

export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()
  const parsed = tokenSchema.pick({ token: true }).safeParse(await request.json().catch(() => null))
  if (!parsed.success) return validationError(parsed.error)
  await prisma.pushToken.deleteMany({ where: { userId: user.id, token: parsed.data.token } })
  return successResponse({ removed: true })
}