import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { unauthorizedResponse, errorResponse, successResponse } from '@/lib/api'
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  generatePublicId,
} from '@/lib/cloudinary'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload/return-image
 * Upload a single evidence image for a return/refund request.
 * Returns { publicId } — stored in ReturnRequestImage after submission.
 * Uses Cloudinary authenticated delivery (private — no public URL).
 *
 * Accepts multipart/form-data with a single "file" field.
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

  const validationError = validateImageFile(file.type, file.size)
  if (validationError) return errorResponse(validationError, 422)

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Magic-bytes check
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP'
  if (!isJpeg && !isPng && !isWebp) {
    return errorResponse('File content does not match an allowed image format.', 422)
  }

  try {
    const result = await uploadToCloudinary(buffer, {
      folder: 'repixl/returns',
      type: 'authenticated', // protected — requires signed URL to view
      publicId: generatePublicId(`return_${user.id.slice(-6)}`),
    })

    // Return publicId only — no secureUrl, because authenticated assets
    // must only be accessed via server-generated signed URLs after authorization.
    return successResponse({ publicId: result.public_id }, 201)
  } catch (err) {
    console.error('[upload/return-image] Cloudinary error:', err)
    return errorResponse('Upload failed. Please try again.', 500)
  }
}

/**
 * DELETE /api/upload/return-image
 * Remove a return evidence image before the return request is submitted
 * (user removed it from the form).
 *
 * Body: { publicId: string }
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

  if (!publicId.startsWith('repixl/returns/')) {
    return errorResponse('Cannot delete this asset', 403)
  }

  await deleteFromCloudinary(publicId, 'authenticated')
  return successResponse({ deleted: true })
}
