import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Build the runtime DATABASE_URL with a conservative connection_limit.
 *
 * Neon pgBouncer pools and Vercel serverless functions both benefit from a
 * shallow per-instance pool. The default Prisma limit (num_cpus * 2 + 1, which
 * resolves to 21 on many environments) is far too high when many short-lived
 * function instances run concurrently — they collectively exhaust Neon's
 * per-project connection cap and trigger P2024 timeouts.
 *
 * connection_limit=5 keeps each instance's pool at 5 connections maximum.
 * timeout=15 gives slightly more headroom than the Prisma default of 10 before
 * a queued acquire fails, reducing false P2024 errors during brief traffic spikes.
 *
 * connection_limit is appended only if the caller has not already set it in
 * DATABASE_URL — this avoids duplicating the parameter in local dev overrides.
 */
function buildDatabaseUrl(): string | undefined {
  const raw = process.env.DATABASE_URL
  if (!raw) return raw

  // Do not double-set if already present in the env value
  if (raw.includes('connection_limit=')) return raw

  const connectionLimit = process.env.PRISMA_CONNECTION_LIMIT ?? '10'
  const poolTimeout = process.env.PRISMA_POOL_TIMEOUT ?? '20'

  const sep = raw.includes('?') ? '&' : '?'
  return `${raw}${sep}connection_limit=${connectionLimit}&pool_timeout=${poolTimeout}`
}

export const prisma =
  globalForPrisma.prisma ??
  (() => {
    const url = buildDatabaseUrl()
    return url
      ? new PrismaClient({ datasources: { db: { url } } })
      : new PrismaClient()
  })()

// Always assign — idempotent within a single JS runtime instance.
// In development this prevents Fast Refresh from opening a new connection pool
// on every module reload. In production (Vercel), separate function instances
// have isolated globalThis scopes anyway, so this is a no-op there.
globalForPrisma.prisma = prisma
