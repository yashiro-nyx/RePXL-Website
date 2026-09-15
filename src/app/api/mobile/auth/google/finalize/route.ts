import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/next-auth-options'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { isRetiredAuthEmail, withAvailableEmail } from '@/lib/retired-auth-email'
import { createMobileOAuthTicket } from '@/lib/mobile-oauth'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const schema = z.object({
  mode: z.enum(['login', 'register', 'auto']).default('auto'),
})

export async function POST(request: NextRequest) {
  try {
    const nextAuthSession = await getServerSession(authOptions)
    if (!nextAuthSession?.user?.email) {
      return errorResponse('No active Google session found. Please try again.', 401)
    }

    const body = await request.json().catch(() => ({}))
    const parsed = schema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { mode } = parsed.data
    const normalizedEmail = nextAuthSession.user.email.toLowerCase().trim()

    if (await isRetiredAuthEmail(normalizedEmail)) {
      return errorResponse(
        'This Google identity is no longer available for sign-in. Use your current RePXL email and password.',
        403
      )
    }

    let user = await prisma.user.findUnique({ where: { email: normalizedEmail } })

    if (mode === 'login') {
      if (!user) {
        return errorResponse('Account not found. Please sign up first.', 404)
      }
      if (user.isArchived) {
        return errorResponse('This account has been deactivated.', 403)
      }
      if (user.role !== 'CUSTOMER') {
        return errorResponse('Admin accounts cannot use Google sign-in on mobile.', 403)
      }
    } else if (mode === 'register') {
      if (user) {
        return errorResponse('An account with this Google email already exists. Please sign in instead.', 409)
      }

      const nameParts = (nextAuthSession.user.name ?? '').trim().split(' ')
      const firstName = nameParts[0] || 'Customer'
      const lastName = nameParts.slice(1).join(' ') || ''

      user = await withAvailableEmail(normalizedEmail, (tx) =>
        tx.user.create({
          data: {
            email: normalizedEmail,
            firstName,
            lastName,
            password: '',
            role: 'CUSTOMER',
          },
        })
      )
    } else {
      // mode === 'auto'
      if (!user) {
        const nameParts = (nextAuthSession.user.name ?? '').trim().split(' ')
        const firstName = nameParts[0] || 'Customer'
        const lastName = nameParts.slice(1).join(' ') || ''

        user = await withAvailableEmail(normalizedEmail, (tx) =>
          tx.user.create({
            data: {
              email: normalizedEmail,
              firstName,
              lastName,
              password: '',
              role: 'CUSTOMER',
            },
          })
        )
      } else {
        if (user.isArchived) {
          return errorResponse('This account has been deactivated.', 403)
        }
        if (user.role !== 'CUSTOMER') {
          return errorResponse('Admin accounts cannot use Google sign-in on mobile.', 403)
        }
      }
    }

    const ticket = createMobileOAuthTicket(user.id, user.email)
    return successResponse({ ticket })
  } catch (error) {
    console.error('Mobile Google finalize error:', error)
    return errorResponse('Internal server error', 500)
  }
}

