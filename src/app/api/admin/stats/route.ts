import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import { getCurrentAdmin } from '@/lib/auth-helpers'

// This route reads cookies / session state and must run per-request.
export const dynamic = 'force-dynamic'

// GET /api/admin/stats — Get dashboard statistics
export async function GET() {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) {
      return unauthorizedResponse('Admin access required')
    }

    // Run all queries in parallel
    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      completedOrders,
      cancelledOrders,
      totalCustomers,
      totalRevenue,
      totalReviews,
      activeVouchers,
      recentOrders,
    ] = await Promise.all([
      prisma.product.count(),
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { stock: { gt: 0, lte: 3 }, status: 'ACTIVE' } }),
      prisma.product.count({ where: { stock: 0, status: 'ACTIVE' } }),
      prisma.order.count({ where: { isArchived: false } }),
      prisma.order.count({ where: { status: 'PROCESSING', isArchived: false } }),
      prisma.order.count({ where: { status: 'SHIPPED', isArchived: false } }),
      prisma.order.count({ where: { status: 'DELIVERED', isArchived: false } }),
      prisma.order.count({ where: { status: 'COMPLETED', isArchived: false } }),
      prisma.order.count({ where: { status: 'CANCELLED', isArchived: false } }),
      prisma.user.count({ where: { role: 'CUSTOMER', isArchived: false } }),
      prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' }, isArchived: false },
        _sum: { total: true },
      }),
      prisma.review.count(),
      prisma.voucher.count({ where: { status: 'ACTIVE' } }),
      prisma.order.findMany({
        where: { isArchived: false },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    return successResponse({
      products: {
        total: totalProducts,
        active: activeProducts,
        lowStock: lowStockProducts,
        outOfStock: outOfStockProducts,
      },
      orders: {
        total: totalOrders,
        processing: processingOrders,
        shipped: shippedOrders,
        delivered: deliveredOrders,
        completed: completedOrders,
        cancelled: cancelledOrders,
      },
      customers: {
        total: totalCustomers,
      },
      revenue: {
        total: totalRevenue._sum.total || 0,
      },
      reviews: {
        total: totalReviews,
      },
      vouchers: {
        active: activeVouchers,
      },
      recentOrders,
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return errorResponse('Internal server error', 500)
  }
}
