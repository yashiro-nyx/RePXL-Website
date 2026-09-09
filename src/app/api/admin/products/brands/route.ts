import { prisma } from '@/lib/prisma'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { errorResponse, successResponse, unauthorizedResponse } from '@/lib/api'

export const dynamic = 'force-dynamic'

// Filter options describe the entire admin catalog, independent of page/search/status.
export async function GET() {
  try {
    if (!await getCurrentAdmin()) return unauthorizedResponse('Admin access required')
    const rows = await prisma.product.findMany({
      select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' },
    })
    return successResponse(rows.map(row => row.brand))
  } catch (error) {
    console.error('List admin product brands error:', error)
    return errorResponse('Unable to load product brands', 500)
  }
}
