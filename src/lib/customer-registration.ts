import bcrypt from 'bcryptjs'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { createMobileSession } from '@/lib/mobile-auth'
import { emailIdentityHash, lockEmailIdentity } from '@/lib/retired-auth-email'
import type { z } from 'zod'
import { registerSchema } from '@/lib/validations'

type RegistrationInput = z.infer<typeof registerSchema>
type MobileMetadata = { deviceName?: string; platform?: string }

export class CustomerRegistrationError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'CustomerRegistrationError'
  }
}

async function createCustomer(
  tx: Prisma.TransactionClient,
  input: RegistrationInput,
  passwordHash: string
) {
  await lockEmailIdentity(tx, input.email)

  const retired = await tx.retiredAuthEmail.findUnique({
    where: { emailHash: emailIdentityHash(input.email) },
    select: { emailHash: true },
  })
  if (retired) {
    throw new CustomerRegistrationError('Email is unavailable for registration.', 409)
  }

  const existing = await tx.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  })
  if (existing) {
    throw new CustomerRegistrationError('An account with this email already exists', 409)
  }

  return tx.user.create({
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      password: passwordHash,
      role: 'CUSTOMER',
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  })
}

export async function registerCustomer(input: RegistrationInput) {
  const passwordHash = await bcrypt.hash(input.password, 12)
  return prisma.$transaction((tx) => createCustomer(tx, input, passwordHash))
}

export async function registerMobileCustomer(
  input: RegistrationInput,
  metadata: MobileMetadata
) {
  const passwordHash = await bcrypt.hash(input.password, 12)
  return prisma.$transaction(async (tx) => {
    const user = await createCustomer(tx, input, passwordHash)
    const tokens = await createMobileSession(user.id, metadata, tx)
    return { user, tokens }
  })
}
