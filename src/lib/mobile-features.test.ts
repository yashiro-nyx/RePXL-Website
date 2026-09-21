import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const mock = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  cookies: new Map<string, string>(),
  findUniqueMobileSession: vi.fn(),
  updateMobileSession: vi.fn(),
  findUniqueUser: vi.fn(),
  findUniqueRecentAuth: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: () => ({
    get: (key: string) => mock.headers.get(key.toLowerCase()) ?? null,
  }),
  cookies: () => ({
    get: (key: string) => {
      const val = mock.cookies.get(key)
      return val !== undefined ? { value: val } : undefined
    },
    set: (key: string, value: string) => {
      mock.cookies.set(key, value)
    },
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mobileSession: {
      findUnique: mock.findUniqueMobileSession,
      update: mock.updateMobileSession,
    },
    user: {
      findUnique: mock.findUniqueUser,
    },
    recentAuthRecord: {
      findUnique: mock.findUniqueRecentAuth,
    },
  },
}))

import { checkRecentAuth, requireRecentAuth } from './auth-helpers'
import { FAQS, FAQ_CATEGORIES } from '../../react-native/data/faqs'
import { QUICK_PROMPTS, generateAiResponse } from '../../react-native/data/ai-concierge'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

describe('Mobile Recent Auth & Bearer Token Verification', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mock.headers.clear()
    mock.cookies.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('validates recent-auth when a valid mobile Bearer token is provided', async () => {
    const userId = 'user_123'
    const accessToken = 'valid-access-token-abc'
    mock.headers.set('authorization', `Bearer ${accessToken}`)

    mock.findUniqueMobileSession.mockResolvedValue({
      id: 'session_1',
      userId,
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins in future
      revokedAt: null,
      user: {
        id: userId,
        email: 'customer@repxl.com',
        firstName: 'Digicam',
        lastName: 'Lover',
        role: 'CUSTOMER',
        isSuperAdmin: false,
        isArchived: false,
      },
    })
    mock.updateMobileSession.mockResolvedValue({})

    const isRecent = await checkRecentAuth(userId)
    expect(isRecent).toBe(true)

    const requireResult = await requireRecentAuth(userId)
    expect(requireResult).toBeNull() // null means allowed to proceed
  })

  it('rejects recent-auth when bearer token belongs to a different user', async () => {
    const targetUserId = 'user_123'
    const otherUserId = 'user_999'
    const accessToken = 'other-user-token'
    mock.headers.set('authorization', `Bearer ${accessToken}`)

    mock.findUniqueMobileSession.mockResolvedValue({
      id: 'session_2',
      userId: otherUserId,
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      revokedAt: null,
      user: {
        id: otherUserId,
        email: 'other@repxl.com',
        firstName: 'Other',
        lastName: 'User',
        role: 'CUSTOMER',
        isSuperAdmin: false,
        isArchived: false,
      },
    })

    const isRecent = await checkRecentAuth(targetUserId)
    expect(isRecent).toBe(false)

    const requireResult = await requireRecentAuth(targetUserId)
    expect(requireResult).toEqual({
      status: 401,
      body: JSON.stringify({
        success: false,
        error: 'Recent authentication required.',
        code: 'RECENT_AUTH_REQUIRED',
      }),
    })
  })

  it('rejects recent-auth when mobile access token is expired', async () => {
    const userId = 'user_123'
    const accessToken = 'expired-token'
    mock.headers.set('authorization', `Bearer ${accessToken}`)

    mock.findUniqueMobileSession.mockResolvedValue({
      id: 'session_3',
      userId,
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(Date.now() - 1000), // expired 1 sec ago
      revokedAt: null,
      user: {
        id: userId,
        email: 'customer@repxl.com',
        firstName: 'Digicam',
        lastName: 'Lover',
        role: 'CUSTOMER',
        isSuperAdmin: false,
        isArchived: false,
      },
    })

    const isRecent = await checkRecentAuth(userId)
    expect(isRecent).toBe(false)
  })

  it('rejects recent-auth when mobile session has been revoked', async () => {
    const userId = 'user_123'
    const accessToken = 'revoked-token'
    mock.headers.set('authorization', `Bearer ${accessToken}`)

    mock.findUniqueMobileSession.mockResolvedValue({
      id: 'session_4',
      userId,
      accessTokenHash: hashToken(accessToken),
      accessExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      revokedAt: new Date(), // revoked
      user: {
        id: userId,
        email: 'customer@repxl.com',
        firstName: 'Digicam',
        lastName: 'Lover',
        role: 'CUSTOMER',
        isSuperAdmin: false,
        isArchived: false,
      },
    })

    const isRecent = await checkRecentAuth(userId)
    expect(isRecent).toBe(false)
  })

  it('rejects recent-auth when no authorization header or cookie is supplied', async () => {
    const isRecent = await checkRecentAuth('user_123')
    expect(isRecent).toBe(false)

    const requireResult = await requireRecentAuth('user_123')
    expect(requireResult).not.toBeNull()
    expect(requireResult?.status).toBe(401)
  })
})

describe('Mobile AI Concierge & Support Features', () => {
  it('contains expected quick prompt chips', () => {
    expect(QUICK_PROMPTS).toContain('How does condition grading work?')
    expect(QUICK_PROMPTS).toContain('Where is my order?')
    expect(QUICK_PROMPTS).toContain('What is your return policy?')
    expect(QUICK_PROMPTS).toContain('Recommend a CCD camera')
    expect(QUICK_PROMPTS).toContain('What payment methods do you accept?')
  })

  it('responds with condition grading details for grading queries', () => {
    const query = 'How do you grade the condition of cameras?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('Mint')
    expect(reply).toContain('Excellent')
    expect(reply).toContain('Good')
    expect(reply).toContain('Fair')
  })

  it('responds with tracking guidelines for shipping and order queries', () => {
    const query = 'Where is my order? How long does delivery take?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('Purchases tab')
    expect(reply).toContain('3–5 business days')
    expect(reply).toContain('push notifications')
  })

  it('responds with return policy information for return and refund queries', () => {
    const query = 'What is your refund and return policy?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('14-day return window')
    expect(reply).toContain('100% free')
    expect(reply).toContain('5–7 business days')
  })

  it('responds with CCD vintage recommendations for camera advice queries', () => {
    const query = 'Can you recommend a CCD camera for a beginner?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('Canon IXY')
    expect(reply).toContain('Kodak EasyShare')
    expect(reply).toContain('Sony Cyber-shot')
    expect(reply).toContain('Try the Look')
  })

  it('responds with supported payment methods for payment queries', () => {
    const query = 'Do you accept GCash or COD for orders?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('Visa')
    expect(reply).toContain('GCash')
    expect(reply).toContain('Cash on Delivery')
    expect(reply).toContain('PayMongo')
  })

  it('directs user to contact tab or email for human agent escalations', () => {
    const query = 'Can I speak to a human representative?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('Contact Us')
    expect(reply).toContain('support@repxl.com')
  })

  it('responds to consignment/trade queries with submission guidance', () => {
    const query = 'How can I sell or trade my old camera?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('RePXL buys vintage digicams')
    expect(reply).toContain('Contact Us')
  })

  it('provides a helpful general overview for unknown prompts', () => {
    const query = 'What is the meaning of life in vintage photography?'
    const reply = generateAiResponse(query)
    expect(reply).toContain('RePXL is your curated home for vintage digital cameras')
  })
})

describe('Mobile Bundled FAQs Data Integrity', () => {
  it('contains expected categories in FAQ_CATEGORIES', () => {
    expect(FAQ_CATEGORIES).toEqual([
      'All',
      'Grading & Condition',
      'Orders, Payment & Shipping',
      'Returns & Refunds',
      'Selling With Us',
    ])
  })

  it('has at least 8 bundled FAQs with valid id, question, answer, and category', () => {
    expect(FAQS.length).toBeGreaterThanOrEqual(8)
    for (const faq of FAQS) {
      expect(faq.id).toBeDefined()
      expect(faq.question.length).toBeGreaterThan(5)
      expect(faq.answer.length).toBeGreaterThan(10)
      expect(FAQ_CATEGORIES).toContain(faq.category)
    }
  })

  it('can filter FAQs by category and search keyword', () => {
    const shippingFaqs = FAQS.filter(
      (f) =>
        f.category === 'Orders, Payment & Shipping' &&
        (f.question.toLowerCase().includes('track') || f.answer.toLowerCase().includes('track'))
    )
    expect(shippingFaqs.length).toBeGreaterThanOrEqual(1)
    expect(
      shippingFaqs[0].question.toLowerCase().includes('track') ||
      shippingFaqs[0].answer.toLowerCase().includes('track')
    ).toBe(true)
  })
})

describe('Mobile API Response Envelope unwrapping logic', () => {
  it('unwraps enveloped { success: true, data: T } responses', () => {
    const enveloped = { success: true, data: { message: 'Password changed successfully' } }
    let result: any
    if (enveloped && typeof enveloped === 'object' && 'success' in enveloped) {
      result = enveloped.data
    } else {
      result = enveloped
    }
    expect(result).toEqual({ message: 'Password changed successfully' })
  })

  it('unwraps plain { message: string } responses without error', () => {
    const plain = { message: "If an account with that email exists, we've sent reset instructions." }
    let result: any
    if (plain && typeof plain === 'object' && 'success' in plain) {
      result = (plain as any).data
    } else {
      result = plain
    }
    expect(result).toEqual({ message: "If an account with that email exists, we've sent reset instructions." })
  })
})
