import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

// POST /api/admin/normalize-defaults — Fix any users with multiple default addresses
// Admin-only endpoint. Run once after deployment.
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) return unauthorizedResponse()

    // Find all users who have more than one default address
    const usersWithMultipleDefaults = await prisma.$queryRaw<{ user_id: string; cnt: bigint }[]>`
      SELECT user_id, COUNT(*) as cnt
      FROM addresses
      WHERE is_default = true
      GROUP BY user_id
      HAVING COUNT(*) > 1
    `

    let fixed = 0
    for (const row of usersWithMultipleDefaults) {
      // Get all default addresses for this user, ordered by creation
      const defaults = await prisma.address.findMany({
        where: { userId: row.user_id, isDefault: true },
        orderBy: { createdAt: 'asc' },
      })
      // Keep the first (oldest) as default, unset all others
      const keepId = defaults[0].id
      const otherIds = defaults.slice(1).map((a) => a.id)
      await prisma.address.updateMany({
        where: { id: { in: otherIds } },
        data: { isDefault: false },
      })
      fixed += otherIds.length
    }

    return successResponse({ message: `Normalized ${fixed} duplicate default addresses across ${usersWithMultipleDefaults.length} users.` })
  } catch (error) {
    console.error('Normalize defaults error:', error)
    return errorResponse('Internal server error', 500)
  }
}
