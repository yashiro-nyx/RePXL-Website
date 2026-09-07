import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse, validationError } from '@/lib/api'
import { getCurrentUser, getCurrentAdmin } from '@/lib/auth-helpers'
import { updateProfileSchema } from '@/lib/validations'
import { maskPhone, maskDob } from '@/lib/mask'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's profile.
 *
 * PRIVACY:
 *   phone and dateOfBirth are sensitive. The profile-display endpoint returns
 *   only pre-masked representations so the raw values never reach the browser
 *   unnecessarily. Dedicated change-flow endpoints (/api/account/phone,
 *   /api/account/dob) operate server-side against the DB row directly.
 *
 *   hasPassword is exposed as a boolean so the UI can detect Google-only accounts
 *   and gate the email-change flow appropriately.
 */
export async function GET(request: NextRequest) {
  try {
    const admin = request.nextUrl.searchParams.get('scope') === 'customer'
      ? null
      : await getCurrentAdmin()
    const user  = admin ?? (await getCurrentUser())
    if (!user) return unauthorizedResponse()

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id:          true,
        email:       true,
        firstName:   true,
        lastName:    true,
        phone:       true,       // read for masking — NOT forwarded to client
        role:        true,
        isSuperAdmin: true,
        createdAt:   true,
        password:    true,       // read to derive hasPassword — NOT forwarded
        username:    true,
        gender:      true,
        dateOfBirth: true,       // read for masking — NOT forwarded to client
        avatarUrl:   true,
      },
    })

    if (!fullUser) return unauthorizedResponse()

    // Compute masked representations server-side.
    const maskedPhone = maskPhone(fullUser.phone)
    const maskedDob   = maskDob(fullUser.dateOfBirth)
    // Build the safe response — phone, dateOfBirth, and password are intentionally
    // excluded so the raw values never leave the server.
    return successResponse({
      id:          fullUser.id,
      email:       fullUser.email,
      firstName:   fullUser.firstName,
      lastName:    fullUser.lastName,
      role:        fullUser.role,
      isSuperAdmin: fullUser.isSuperAdmin,
      createdAt:   fullUser.createdAt,
      username:    fullUser.username,
      gender:      fullUser.gender,
      avatarUrl:   fullUser.avatarUrl,
      // Masked display values
      maskedPhone,
      maskedDob,
      // Derived flag — no hash exposed
      hasPassword: !!fullUser.password && fullUser.password.length > 0,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}

/**
 * PUT /api/auth/me
 *
 * Updates non-sensitive profile fields only.
 *
 * SECURITY: phone, dateOfBirth, and email are DELIBERATELY excluded.
 *   They require dedicated OTP-verified flows:
 *     POST /api/account/phone
 *     POST /api/account/dob
 *     POST /api/account/email
 *
 *   Zod's strip mode removes any extra keys, so passing those fields in the
 *   request body has no effect. The Prisma update below also explicitly
 *   enumerates only the allowed fields as a second layer of defence.
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = request.nextUrl.searchParams.get('scope') === 'customer'
      ? null
      : await getCurrentAdmin()
    const user  = admin ?? (await getCurrentUser())
    if (!user) return unauthorizedResponse()

    const body   = await request.json()
    const parsed = updateProfileSchema.safeParse(body)
    if (!parsed.success) return validationError(parsed.error)

    const { firstName, lastName, username, gender, avatarUrl } = parsed.data

    // Username uniqueness check
    if (username !== undefined && username !== null) {
      const existing = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      })
      if (existing && existing.id !== user.id) {
        return errorResponse('Username is already taken', 409)
      }
    }

    // EXPLICIT whitelist — phone, dateOfBirth, and email are never included.
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        ...(username  !== undefined ? { username:  username  ?? null } : {}),
        ...(gender    !== undefined ? { gender:    gender    ?? null } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl: avatarUrl ?? null } : {}),
      },
      select: {
        id:          true,
        email:       true,
        firstName:   true,
        lastName:    true,
        phone:       true,
        password: true,
        role:        true,
        isSuperAdmin: true,
        username:    true,
        gender:      true,
        dateOfBirth: true,
        avatarUrl:   true,
        createdAt:   true,
      },
    })

    // Return masked sensitive fields in the PUT response too
    return successResponse({
      id:          updated.id,
      email:       updated.email,
      firstName:   updated.firstName,
      lastName:    updated.lastName,
      role:        updated.role,
      isSuperAdmin: updated.isSuperAdmin,
      username:    updated.username,
      gender:      updated.gender,
      avatarUrl:   updated.avatarUrl,
      createdAt:   updated.createdAt,
      maskedPhone: maskPhone(updated.phone),
      maskedDob:   maskDob(updated.dateOfBirth),
      hasPassword: !!updated.password,
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return errorResponse('Internal server error', 500)
  }
}
