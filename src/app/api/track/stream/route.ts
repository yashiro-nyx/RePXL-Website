// GET /api/track/stream?tracking=CAM-XXXXXX
// Server-Sent Events endpoint that streams real-time tracking updates.
// Uses Edge Runtime + @neondatabase/serverless for non-blocking polling.
// Polls the DB every 2500ms; fires a data event only when updatedAt changes.

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

import { neon } from '@neondatabase/serverless'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const trackingNumber = searchParams.get('tracking')

  if (!trackingNumber) {
    return new Response('Missing ?tracking= parameter', { status: 400 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()

  let lastUpdatedAt: string | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null

  const sendEvent = (data: Record<string, unknown>) => {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
  }

  // Initial fetch — send current state immediately
  const poll = async () => {
    try {
      const rows = await sql`
        SELECT
          delivery_status   AS status,
          tracking_progress AS progress,
          tracking_description AS description,
          updated_at        AS updated_at
        FROM orders
        WHERE tracking_number = ${trackingNumber}
        LIMIT 1
      `

      if (rows.length === 0) return

      const row = rows[0] as {
        status: string
        progress: number
        description: string
        updated_at: string
      }

      const rowTs = new Date(row.updated_at).toISOString()

      if (lastUpdatedAt === null || rowTs !== lastUpdatedAt) {
        lastUpdatedAt = rowTs
        sendEvent({
          status: row.status,
          progress: row.progress,
          description: row.description,
        })
      }
    } catch (err) {
      // Non-fatal — log and continue polling
      console.error('[SSE stream] poll error:', err)
    }
  }

  // Run first poll immediately, then every 2500ms
  void poll()
  intervalId = setInterval(() => { void poll() }, 2500)

  // Clean up on client disconnect
  request.signal.addEventListener('abort', () => {
    if (intervalId) clearInterval(intervalId)
    writer.close().catch(() => { /* ignore */ })
  })

  return new Response(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // Nginx / Vercel: disable buffering
    },
  })
}
