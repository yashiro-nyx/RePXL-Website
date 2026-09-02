// GET /api/track/stream?tracking=<orderNumber>
// Server-Sent Events endpoint that streams real-time tracking updates.
// Polls the DB every 3 seconds using the Node.js runtime (Edge doesn't support setInterval).

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('tracking')

  if (!trackingNumber) {
    return new Response('Missing ?tracking= parameter', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let lastUpdatedAt: string | null = null
      let closed = false

      const send = (data: Record<string, unknown>) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        } catch {
          // Controller already closed
        }
      }

      const poll = async () => {
        if (closed) return
        try {
          // Query by order_number (primary) or tracking_number (set after first admin update)
          const order = await prisma.order.findFirst({
            where: {
              OR: [
                { orderNumber: trackingNumber },
                { trackingNumber: trackingNumber.trim() !== '' ? trackingNumber : '__never__' },
              ],
            },
            select: {
              deliveryStatus: true,
              trackingProgress: true,
              trackingDescription: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: 'desc' },
          })

          if (!order) return

          const rowTs = order.updatedAt.toISOString()
          if (lastUpdatedAt === null || rowTs !== lastUpdatedAt) {
            lastUpdatedAt = rowTs
            send({
              status: order.deliveryStatus,
              progress: order.trackingProgress,
              description: order.trackingDescription,
            })
          }
        } catch (err) {
          console.error('[SSE stream] poll error:', err)
        }
      }

      // Initial poll immediately
      await poll()

      // Poll every 3 seconds
      const intervalId = setInterval(() => { void poll() }, 3000)

      // Stop polling when client disconnects
      request.signal.addEventListener('abort', () => {
        closed = true
        clearInterval(intervalId)
        try { controller.close() } catch { /* already closed */ }
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
