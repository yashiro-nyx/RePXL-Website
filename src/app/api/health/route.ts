import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'disconnected'
  let dbLatencyMs = -1

  try {
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1`
    dbLatencyMs = Date.now() - dbStart
    dbStatus = 'connected'
  } catch (err) {
    console.error('[health check] Database probe failed:', err)
    dbStatus = 'error'
  }

  const memory = process.memoryUsage()
  const isHealthy = dbStatus === 'connected'

  const body = {
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    responseTimeMs: Date.now() - startTime,
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    memory: {
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
      rssMb: Math.round(memory.rss / 1024 / 1024),
    },
  }

  return NextResponse.json(body, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

