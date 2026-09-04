'use client'

import { useRef, useState } from 'react'

export interface UploadedImage {
  /** Cloudinary public_id — stored in DB after form submission */
  publicId: string
  /** Preview URL — for review images this is the CDN URL; for return images it's a local object URL */
  previewUrl: string
  /** Whether this image has finished uploading to Cloudinary */
  uploaded: boolean
}

interface ImageUploaderProps {
  /** Images currently selected/uploaded */
  images: UploadedImage[]
  onChange: (images: UploadedImage[]) => void
  /** Upload endpoint — either /api/upload/review-image or /api/upload/return-image */
  uploadEndpoint: string
  /** Endpoint to DELETE an orphan image before submission */
  deleteEndpoint: string
  maxImages?: number
  /** If true, at least one image is required */
  required?: boolean
  /** Shown when required is true and no images are provided */
  requiredError?: string
  /** General upload error shown below the uploader */
  error?: string
  disabled?: boolean
  label?: string
  hint?: string
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024

export function ImageUploader({
  images,
  onChange,
  uploadEndpoint,
  deleteEndpoint,
  maxImages = 5,
  required = false,
  requiredError,
  error,
  disabled = false,
  label = 'Add Photos',
  hint,
}: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const canAddMore = images.length < maxImages && !disabled

  const handleFiles = async (files: FileList) => {
    setUploadError(null)
    const remaining = maxImages - images.length
    const toProcess = Array.from(files).slice(0, remaining)

    if (toProcess.length === 0) return

    // Client-side validation
    for (const file of toProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploadError(`Unsupported file type: ${file.type}. Use JPG, PNG, or WebP.`)
        return
      }
      if (file.size > MAX_SIZE_BYTES) {
        setUploadError(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum 5 MB.`)
        return
      }
    }

    setUploading(true)
    const newImages: UploadedImage[] = []

    for (const file of toProcess) {
      // Show preview immediately using object URL
      const previewUrl = URL.createObjectURL(file)
      const pending: UploadedImage = { publicId: '', previewUrl, uploaded: false }
      // Add a temporary entry so the user sees the image immediately
      newImages.push(pending)
    }

    // Add all previews at once
    onChange([...images, ...newImages])

    // Now upload each file
    const results: UploadedImage[] = [...images]
    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i]
      const previewUrl = newImages[i].previewUrl

      const form = new FormData()
      form.append('file', file)

      try {
        const res = await fetch(uploadEndpoint, { method: 'POST', body: form, credentials: 'include' })
        const json = await res.json()
        if (!res.ok) {
          setUploadError(json.error ?? 'Upload failed. Please try again.')
          // Remove the failed image from the list
          URL.revokeObjectURL(previewUrl)
          continue
        }
        results.push({
          publicId: json.data.publicId,
          // For review images the API returns secureUrl; for return images use the preview
          previewUrl: json.data.secureUrl ?? previewUrl,
          uploaded: true,
        })
      } catch {
        setUploadError('Upload failed. Please check your connection and try again.')
        URL.revokeObjectURL(previewUrl)
      }
    }

    onChange(results)
    setUploading(false)

    // Reset the file input so the same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleRemove = async (index: number) => {
    const img = images[index]
    if (!img) return

    // Revoke local object URL to free memory
    if (img.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(img.previewUrl)
    }

    // Delete from Cloudinary if already uploaded
    if (img.uploaded && img.publicId) {
      try {
        await fetch(deleteEndpoint, {
          method: 'DELETE',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicId: img.publicId }),
        })
      } catch {
        // Non-critical — log and continue
        console.warn('[ImageUploader] delete orphan failed:', img.publicId)
      }
    }

    const updated = images.filter((_, i) => i !== index)
    onChange(updated)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!canAddMore || disabled) return
    if (e.dataTransfer.files.length > 0) {
      void handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault() }

  const showRequiredError = required && images.length === 0 && requiredError

  return (
    <div className="space-y-3">
      {/* Label + count */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-wider text-repixl-muted">
          {label}
          {required && <span className="ml-1 text-repixl-red">*</span>}
        </p>
        <span className="font-mono text-[10px] text-repixl-muted">
          {images.length} / {maxImages}
        </span>
      </div>

      {/* Hint text */}
      {hint && (
        <p className="text-xs text-repixl-text-light/50">{hint}</p>
      )}

      {/* Drop zone / file picker */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className={`relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-repixl-muted/25 bg-repixl-bg/30 px-4 py-6 text-center transition-colors hover:border-repixl-muted/50 hover:bg-repixl-bg/50 ${uploading ? 'cursor-not-allowed opacity-60' : ''}`}
          onClick={() => !uploading && fileInputRef.current?.click()}
          role="button"
          aria-label="Upload images"
          tabIndex={0}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click() } }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            className="sr-only"
            disabled={uploading || disabled}
            aria-label="Select images"
            onChange={(e) => { if (e.target.files?.length) void handleFiles(e.target.files) }}
          />
          {uploading ? (
            <>
              <svg className="h-5 w-5 animate-spin text-repixl-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-xs text-repixl-muted">Uploading…</span>
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-xs text-repixl-text-light/60">
                Click or drag to upload{maxImages - images.length > 1 ? ` (up to ${maxImages - images.length} more)` : ''}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-repixl-muted/50">
                JPG · PNG · WebP · Max 5 MB each
              </span>
            </>
          )}
        </div>
      )}

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((img, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-repixl-muted/20 bg-repixl-bg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.previewUrl || ''}
                alt={`Upload ${i + 1}`}
                className="h-full w-full object-cover"
              />
              {/* Loading overlay for pending uploads */}
              {!img.uploaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              )}
              {/* Remove button */}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); void handleRemove(i) }}
                  aria-label={`Remove image ${i + 1}`}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-repixl-red/60"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                    <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {(uploadError || error || showRequiredError) && (
        <p className="text-xs text-red-400" role="alert">
          {uploadError ?? error ?? requiredError}
        </p>
      )}
    </div>
  )
}
