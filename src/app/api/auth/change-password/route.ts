import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { changePasswordSchema } from '@/lib/validations'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return unauthorizedResponse()
    }

    const body = await request.json()
    const parsed = changePasswordSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const { oldPassword, newPassword } = parsed.data

    // Get full user with password
    const fullUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!fullUser) {
      return unauthorizedResponse()
    }

    // Verify current password
    const valid = await bcrypt.compare(oldPassword, fullUser.password)
    if (!valid) {
      return errorResponse('Current password is incorrect', 400)
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return successResponse({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return errorResponse('Internal server error', 500)
  }
}
