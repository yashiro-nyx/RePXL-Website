import { createHash, randomBytes } from 'crypto'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import type { SessionUser } from '@/lib/auth-helpers'

const ACCESS_TTL_MS = 15 * 60 * 1000
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

export interface MobileTokenPair {
  accessToken: string
  refreshToken: string
  accessExpiresAt: string
  refreshExpiresAt: string
}

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

function newToken() {
  return randomBytes(32).toString('base64url')
}

function userShape(user: {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'CUSTOMER' | 'ADMIN'
  isSuperAdmin: boolean
}): SessionUser {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  }
}

export async function createMobileSession(
  userId: string,
  metadata?: { deviceName?: string; platform?: string }
): Promise<MobileTokenPair> {
  const now = Date.now()
  const accessToken = newToken()
  const refreshToken = newToken()
  const accessExpiresAt = new Date(now + ACCESS_TTL_MS)
  const refreshExpiresAt = new Date(now + REFRESH_TTL_MS)

  await prisma.mobileSession.create({
    data: {
      userId,
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(refreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      deviceName: metadata?.deviceName?.slice(0, 100),
      platform: metadata?.platform?.slice(0, 30),
    },
  })

  return {
    accessToken,
    refreshToken,
    accessExpiresAt: accessExpiresAt.toISOString(),
    refreshExpiresAt: refreshExpiresAt.toISOString(),
  }
}

export async function getMobileUserFromAccessToken(token: string): Promise<SessionUser | null> {
  const session = await prisma.mobileSession.findUnique({
    where: { accessTokenHash: hashToken(token) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.accessExpiresAt.getTime() <= Date.now()) return null
  if (session.user.isArchived || session.user.role !== 'CUSTOMER') return null

  await prisma.mobileSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  })
  return userShape(session.user)
}

export async function getMobileUser(request: NextRequest): Promise<SessionUser | null> {
  const header = request.headers.get('authorization')
  const token = header?.match(/^Bearer\s+([^\s]+)$/i)?.[1]
  return token ? getMobileUserFromAccessToken(token) : null
}

export async function refreshMobileSession(
  refreshToken: string,
  metadata?: { deviceName?: string; platform?: string }
) {
  const session = await prisma.mobileSession.findUnique({
    where: { refreshTokenHash: hashToken(refreshToken) },
    include: { user: true },
  })
  if (!session || session.revokedAt || session.refreshExpiresAt.getTime() <= Date.now()) return null
  if (session.user.isArchived || session.user.role !== 'CUSTOMER') return null

  const accessToken = newToken()
  const nextRefreshToken = newToken()
  const accessExpiresAt = new Date(Date.now() + ACCESS_TTL_MS)
  const refreshExpiresAt = new Date(Date.now() + REFRESH_TTL_MS)
  await prisma.mobileSession.update({
    where: { id: session.id },
    data: {
      accessTokenHash: hashToken(accessToken),
      refreshTokenHash: hashToken(nextRefreshToken),
      accessExpiresAt,
      refreshExpiresAt,
      lastUsedAt: new Date(),
      deviceName: metadata?.deviceName?.slice(0, 100) ?? session.deviceName,
      platform: metadata?.platform?.slice(0, 30) ?? session.platform,
    },
  })

  return {
    user: userShape(session.user),
    tokens: {
      accessToken,
      refreshToken: nextRefreshToken,
      accessExpiresAt: accessExpiresAt.toISOString(),
      refreshExpiresAt: refreshExpiresAt.toISOString(),
    },
  }
}

export async function revokeMobileSession(refreshToken: string) {
  await prisma.mobileSession.updateMany({
    where: { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    data: { revokedAt: new Date() },
  })
}

export function mobileUserResponse(user: SessionUser) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isSuperAdmin: user.isSuperAdmin,
  }
}