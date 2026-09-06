import { NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'
import { unauthorizedResponse, errorResponse, successResponse } from '@/lib/api'
import {
  uploadToCloudinary,
  deleteFromCloudinary,
  validateImageFile,
  generatePublicId,
} from '@/lib/cloudinary'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/upload/avatar
 * Upload a customer profile avatar.
 * Returns { avatarUrl } — a public CDN URL stored on the User record.
 *
 * Accepts multipart/form-data with a single "file" field.
 * Previous avatar is deleted from Cloudinary when replaced.
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
  const isPng  = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP'
  if (!isJpeg && !isPng && !isWebp) {
    return errorResponse('File content does not match an allowed image format.', 422)
  }

  // Fetch existing avatar to delete the old one after successful upload
  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  })

  try {
    const result = await uploadToCloudinary(buffer, {
      folder: 'repixl/avatars',
      type: 'upload', // public CDN — profile photos are not sensitive
      publicId: generatePublicId(`avatar_${user.id.slice(-8)}`),
    })

    // Persist the new URL
    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: result.secure_url },
    })

    // Clean up old avatar (best-effort — do not fail the request if this fails)
    if (existing?.avatarUrl) {
      const oldPublicId = extractPublicId(existing.avatarUrl)
      if (oldPublicId) {
        deleteFromCloudinary(oldPublicId, 'upload').catch(() => undefined)
      }
    }

    return successResponse({ avatarUrl: result.secure_url }, 201)
  } catch (err) {
    console.error('[upload/avatar] Cloudinary error:', err)
    return errorResponse('Upload failed. Please try again.', 500)
  }
}

/**
 * DELETE /api/upload/avatar
 * Remove the customer's profile avatar.
 */
export async function DELETE() {
  const user = await getCurrentUser()
  if (!user) return unauthorizedResponse()

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarUrl: true },
  })

  if (existing?.avatarUrl) {
    const publicId = extractPublicId(existing.avatarUrl)
    if (publicId) {
      deleteFromCloudinary(publicId, 'upload').catch(() => undefined)
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  })

  return successResponse({ removed: true })
}

/**
 * Extract the Cloudinary public_id from a CDN URL.
 * e.g. https://res.cloudinary.com/{cloud}/image/upload/repixl/avatars/avatar_xxx → repixl/avatars/avatar_xxx
 */
function extractPublicId(url: string): string | null {
  try {
    const match = url.match(/\/image\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/)
    return match ? match[1] : null
  } catch {
    return null
  }
}
