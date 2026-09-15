import { createHash, createHmac, randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

interface OAuthTicketPayload {
  userId: string
  email: string
  nonce: string
  exp: number
}

function secretKey(): string {
  return process.env.NEXTAUTH_SECRET || 'repxl-mobile-oauth-secret'
}

/**
 * Creates a cryptographically signed, short-lived single-use ticket
 * to securely pass auth state back to the mobile app without exposing
 * long-lived tokens in query strings.
 */
export function createMobileOAuthTicket(userId: string, email: string): string {
  const payload: OAuthTicketPayload = {
    userId,
    email: email.toLowerCase().trim(),
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + 120_000, // 2 minutes
  }
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const hmac = createHmac('sha256', secretKey()).update(payloadStr).digest('base64url')
  return `${payloadStr}.${hmac}`
}

/**
 * Verifies the ticket signature, checks expiration, and enforces single-use replay protection.
 */
export async function verifyAndConsumeMobileOAuthTicket(ticket: string): Promise<OAuthTicketPayload | null> {
  try {
    const parts = ticket.split('.')
    if (parts.length !== 2) return null
    const [payloadStr, hmac] = parts
    if (!payloadStr || !hmac) return null

    const expectedHmac = createHmac('sha256', secretKey()).update(payloadStr).digest('base64url')
    if (hmac !== expectedHmac) return null

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8')) as OAuthTicketPayload
    if (!payload.userId || !payload.email || !payload.nonce || !payload.exp) return null
    if (Date.now() > payload.exp) return null

    // Enforce single-use replay protection via hashed token lookup
    const tokenHash = createHash('sha256').update(ticket).digest('hex')
    const existing = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })
    if (existing) {
      return null // Already consumed
    }

    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        email: payload.email,
        expiresAt: new Date(payload.exp),
        usedAt: new Date(),
      },
    })

    return payload
  } catch {
    return null
  }
}

