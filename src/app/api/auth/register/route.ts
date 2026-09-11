import { NextRequest } from 'next/server'
import { successResponse, errorResponse, validationError } from '@/lib/api'
import { registerSchema } from '@/lib/validations'
import { setSessionCookie } from '@/lib/auth-helpers'
import { CustomerRegistrationError, registerCustomer } from '@/lib/customer-registration'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = registerSchema.safeParse(body)

    if (!parsed.success) {
      return validationError(parsed.error)
    }

    const user = await registerCustomer(parsed.data)

    // Set session cookie
    setSessionCookie(user.id)

    return successResponse(user, 201)
  } catch (error) {
    if (error instanceof CustomerRegistrationError) {
      return errorResponse(error.message, error.status)
    }
    console.error('Register error:', error)
    return errorResponse('Internal server error', 500)
  }
}
