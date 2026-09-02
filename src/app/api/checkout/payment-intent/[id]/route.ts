import { NextRequest } from 'next/server'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentUser } from '@/lib/auth-helpers'
import { isPaymongoConfigured, retrievePaymentIntent } from '@/lib/paymongo'

export const dynamic = 'force-dynamic'

/**
 * GET /api/checkout/payment-intent/[id]
 *
 * Retrieves the current status of a Payment Intent from PayMongo.
 * Used by the frontend to poll for payment completion after the
 * customer completes 3DS authentication or e-wallet authorization.
 *
 * Returns only the fields the frontend needs — never exposes the
 * secret key or full PI object to the client.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!isPaymongoConfigured()) {
      return errorResponse('Payment not configured.', 503)
    }

    const user = await getCurrentUser()
    if (!user) return unauthorizedResponse()

    const intent = await retrievePaymentIntent(params.id)

    return successResponse({
      intentId: intent.id,
      status: intent.attributes.status,
      // Only surface the error message, not the full internal PayMongo error object
      lastPaymentError: intent.attributes.last_payment_error
        ? {
            code: intent.attributes.last_payment_error.failed_code,
            message: intent.attributes.last_payment_error.failed_message,
          }
        : null,
    })
  } catch (error) {
    console.error('Retrieve payment intent error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Failed to retrieve payment status',
      500
    )
  }
}
