import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
export const emailIdentityHash = (email: string) =>
  createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
export async function isRetiredAuthEmail(email: string) {
  return !!(await prisma.retiredAuthEmail.findUnique({
    where: { emailHash: emailIdentityHash(email) },
    select: { emailHash: true },
  }))
}

import type { Prisma } from '@prisma/client'
export async function lockEmailIdentity(
  tx: Prisma.TransactionClient,
  email: string
) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${emailIdentityHash(email)}, 0))::text AS locked`
}
export async function withAvailableEmail<T>(
  email: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await lockEmailIdentity(tx, email)
    if (
      await tx.retiredAuthEmail.findUnique({
        where: { emailHash: emailIdentityHash(email) },
      })
    )
      throw new Error('Email unavailable')
    return work(tx)
  })
}
