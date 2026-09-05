// GET /api/track/stream?tracking=<orderNumber or trackingNumber>
// Only the order owner or an authenticated admin may stream delivery updates.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { getCurrentAdmin, getCurrentUser } from '@/lib/auth-helpers'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const admin = await getCurrentAdmin()
  const user = admin ?? await getCurrentUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const trackingNumber = request.nextUrl.searchParams.get('tracking')?.trim()
  if (!trackingNumber) return new Response('Missing ?tracking= parameter', { status: 400 })

  // Scope the lookup itself to the owner, so unknown and other users' orders
  // produce the same response. Admin access requires the separate admin cookie.
  const ownership = admin ? {} : { userId: user.id }
  const select = {
    id: true,
    deliveryStatus: true,
    trackingProgress: true,
    trackingDescription: true,
    updatedAt: true,
  } as const
  const initial = await prisma.order.findFirst({
    where: {
      ...ownership,
      OR: [{ orderNumber: trackingNumber }, { trackingNumber }],
    },
    select,
    orderBy: { updatedAt: 'desc' },
  })
  if (!initial) return new Response('Order not found', { status: 404 })

  const encoder = new TextEncoder()
  let stop = () => {}
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      let timer: ReturnType<typeof setTimeout> | undefined
      let lastUpdatedAt = initial.updatedAt.toISOString()

      const cleanup = () => {
        closed = true
        clearTimeout(timer)
        request.signal.removeEventListener('abort', close)
      }
      const close = () => {
        if (closed) return
        cleanup()
        controller.close()
      }
      stop = cleanup

      const send = (order: typeof initial) => {
        if (closed) return
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          status: order.deliveryStatus,
          progress: order.trackingProgress,
          description: order.trackingDescription,
        })}\n\n`))
      }

      const poll = async () => {
        if (closed) return
        try {
          // Recheck expiration, archival and admin role during long-lived streams.
          const current = admin ? await getCurrentAdmin() : await getCurrentUser()
          if (!current || current.id !== user.id) return close()
          if (closed) return
          const order = await prisma.order.findFirst({
            where: { id: initial.id, ...ownership },
            select,
          })
          if (closed) return
          if (!order) return close()
          const updatedAt = order.updatedAt.toISOString()
          if (updatedAt !== lastUpdatedAt) {
            lastUpdatedAt = updatedAt
            send(order)
          }
          timer = setTimeout(() => { void poll() }, 3000)
        } catch {
          close()
        }
      }

      request.signal.addEventListener('abort', close, { once: true })
      if (request.signal.aborted) return close()
      send(initial)
      timer = setTimeout(() => { void poll() }, 3000)
    },
    cancel() { stop() },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'private, no-store, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
