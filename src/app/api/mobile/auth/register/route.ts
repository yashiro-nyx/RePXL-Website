import { NextRequest } from 'next/server'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { CustomerRegistrationError, registerMobileCustomer } from '@/lib/customer-registration'
import { mobileUserResponse } from '@/lib/mobile-auth'
import { registerSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const parsed = registerSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return validationError(parsed.error)

    const result = await registerMobileCustomer(parsed.data, {
      deviceName: request.headers.get('x-device-name') ?? undefined,
      platform: request.headers.get('x-platform') ?? undefined,
    })

    return successResponse({
      mfaRequired: false,
      user: mobileUserResponse(result.user),
      tokens: result.tokens,
    }, 201)
  } catch (error) {
    if (error instanceof CustomerRegistrationError) {
      return errorResponse(error.message, error.status)
    }
    console.error('Mobile registration failed')
    return errorResponse('Internal server error', 500)
  }
}
