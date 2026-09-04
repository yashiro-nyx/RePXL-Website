/**
 * Cloudinary server-side utility.
 * NEVER import this file from client components — it reads API secrets.
 * Only use in API route handlers (server context).
 */

import { v2 as cloudinary } from 'cloudinary'

// Configure once from server-only environment variables.
// CLOUDINARY_API_SECRET must NEVER be prefixed with NEXT_PUBLIC_.
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

export { cloudinary }

/** Allowed MIME types for customer uploads */
export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

/** 5 MB in bytes */
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024

/** Maximum images per review or return request */
export const MAX_IMAGES = 5

/**
 * Upload a buffer to Cloudinary.
 * Returns the upload result including public_id and secure_url.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder: string
    /** 'upload' = public CDN (reviews), 'authenticated' = private (return evidence) */
    type?: 'upload' | 'authenticated'
    publicId?: string
  }
) {
  return new Promise<{ public_id: string; secure_url: string; resource_type: string; type: string }>(
    (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.publicId,
          resource_type: 'image',
          type: options.type ?? 'upload',
          // Restrict incoming formats at the Cloudinary level too
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          // Strip EXIF metadata for privacy
          exif: false,
          // Reject files over 5 MB (belt-and-suspenders — we also validate client-side)
          max_bytes: MAX_FILE_SIZE_BYTES,
        },
        (error, result) => {
          if (error) return reject(error)
          if (!result) return reject(new Error('No result from Cloudinary'))
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            type: result.type,
          })
        }
      )
      uploadStream.end(buffer)
    }
  )
}

/**
 * Delete a Cloudinary asset by public_id.
 * type should match how it was uploaded ('upload' or 'authenticated').
 */
export async function deleteFromCloudinary(publicId: string, type: 'upload' | 'authenticated' = 'upload') {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image', type, invalidate: true })
  } catch (err) {
    // Log but do not throw — orphan cleanup failures should not break the main flow
    console.error('[cloudinary] delete failed:', publicId, err)
  }
}

/**
 * Generate a truly time-limited private download URL for a protected
 * (authenticated) Cloudinary asset.
 *
 * Uses cloudinary.utils.private_download_url which routes through
 * https://api.cloudinary.com/v1_1/{cloud}/image/download — Cloudinary's
 * API server validates the HMAC signature AND the expires_at timestamp
 * server-side and rejects the request after expiration.
 *
 * IMPORTANT: cloudinary.url() with sign_url+expires_at does NOT actually
 * expire — the expires_at is ignored by that function and the generated
 * CDN URL remains permanently valid. private_download_url is the correct
 * approach for genuinely time-limited access.
 *
 * Free plan compatible — uses standard request signing, no paid feature.
 *
 * @param publicId - Cloudinary public_id of the protected image
 * @param expiresInSeconds - How long the URL stays valid (default 90s)
 */
export function generateSignedUrl(publicId: string, expiresInSeconds = 90): string {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds

  // Determine extension from publicId — default to jpg if not present
  const ext = publicId.includes('.') ? publicId.split('.').pop()! : 'jpg'
  const pid = publicId.includes('.') ? publicId.substring(0, publicId.lastIndexOf('.')) : publicId

  return cloudinary.utils.private_download_url(pid, ext, {
    resource_type: 'image',
    expires_at: expiresAt,
  })
}

/**
 * Validate an uploaded file's MIME type and size.
 * Returns an error string or null if valid.
 */
export function validateImageFile(mimeType: string, sizeBytes: number): string | null {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return `Unsupported file type: ${mimeType}. Allowed: JPG, PNG, WebP.`
  }
  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB.`
  }
  return null
}

/**
 * Generate a safe, unique public_id for a Cloudinary upload.
 * Does NOT include raw customer filenames or PII.
 */
export function generatePublicId(prefix: string): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}_${timestamp}_${random}`
}
