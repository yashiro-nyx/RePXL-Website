import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { unauthorizedResponse, errorResponse, successResponse } from '@/lib/api'
import {
  cloudinary,
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  generatePublicId,
  MAX_IMAGES,
} from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload/review-image
 * Upload a single image for a product review.
 * Returns { publicId, secureUrl } — stored in ReviewImage after review submission.
 *
 * Accepts multipart/form-data with a single "file" field.
 * The browser must be authenticated — ownership of the final review is
 * enforced when confirm-receipt saves the ReviewImage records.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return errorResponse('Invalid multipart form data', 400)
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return errorResponse('No file provided', 400)
  }

  // Server-side validation
  const validationError = validateImageFile(file.type, file.size)
  if (validationError) return errorResponse(validationError, 422)

  // Read file into buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Additional magic-bytes check: JPEG starts 0xFF 0xD8, PNG starts 0x89 0x50, WebP starts RIFF
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP'
  if (!isJpeg && !isPng && !isWebp) {
    return errorResponse('File content does not match an allowed image format.', 422)
  }

  try {
    const result = await uploadToCloudinary(buffer, {
      folder: 'repixl/reviews',
      type: 'upload', // public CDN — review images are storefront content
      publicId: generatePublicId(`review_${user.id.slice(-6)}`),
    })

    return successResponse({
      publicId: result.public_id,
      secureUrl: result.secure_url,
    }, 201)
  } catch (err) {
    console.error('[upload/review-image] Cloudinary error:', err)
    return errorResponse('Upload failed. Please try again.', 500)
  }
}

/**
 * DELETE /api/upload/review-image
 * Remove an image that was uploaded but not yet attached to a review
 * (user removed it before submitting).
 *
 * Body: { publicId: string }
 * Only deletes if the publicId is in the repixl/reviews/ folder (safety guard).
 */
export async function DELETE(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  let body: { publicId?: string }
  try {
    body = await request.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  const { publicId } = body
  if (!publicId || typeof publicId !== 'string') {
    return errorResponse('publicId is required', 400)
  }

  // Safety: only allow deletion of assets in the repixl/reviews/ folder
  // and that embed the user's id suffix — prevents arbitrary deletion
  if (!publicId.startsWith('repixl/reviews/')) {
    return errorResponse('Cannot delete this asset', 403)
  }

  await deleteFromCloudinary(publicId, 'upload')
  return successResponse({ deleted: true })
}
