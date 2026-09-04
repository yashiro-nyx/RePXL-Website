import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { unauthorizedResponse, errorResponse, successResponse, forbiddenResponse } from '@/lib/api'
import { generateSignedUrl } from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

/**
 * GET /api/upload/return-image/signed?returnRequestId=xxx
 *
 * Generates short-lived signed Cloudinary URLs for all images belonging to a
 * specific return request.  Authorization:
 *   - Customer: must own the return request (verified via session → DB)
 *   - Admin:    any admin session is authorized
 *
 * NEVER returns raw publicIds as viewable URLs — always signs them server-side.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const returnRequestId = searchParams.get('returnRequestId')

  if (!returnRequestId) {
    return errorResponse('returnRequestId is required', 400)
  }

  // Check admin first, then customer
  const admin = await getCurrentAdmin()
  const user = admin ? null : await getCurrentUser()

  if (!admin && !user) return unauthorizedResponse()

  // Load the return request to verify ownership
  const returnRequest = await prisma.returnRequest.findUnique({
    where: { id: returnRequestId },
    include: { images: { orderBy: { sortOrder: 'asc' } } },
  })

  if (!returnRequest) {
    return errorResponse('Return request not found', 404)
  }

  // Customer ownership check
  if (!admin && user && returnRequest.userId !== user.id) {
    return forbiddenResponse('You do not have access to this return request')
  }

  // Generate a 90-second signed URL for each image
  const signedImages = returnRequest.images.map((img) => ({
    id: img.id,
    sortOrder: img.sortOrder,
    signedUrl: generateSignedUrl(img.publicId, 90),
  }))

  return successResponse({ images: signedImages })
}
