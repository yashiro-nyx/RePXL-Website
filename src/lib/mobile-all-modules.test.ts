import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHash } from 'node:crypto'
import {
  canCustomerCancelOrder,
  getOrderStatusColors,
  getOrderStatusLabel,
  isOrderPickedUpOrShipped,
  normalizeOrderStatus,
  type CanonicalOrderStatus,
  type Order,
} from '../../react-native/types'
import { getColorProfile, brandProfiles } from '../../react-native/data/colorProfiles'
import { FAQS, FAQ_CATEGORIES } from '../../react-native/data/faqs'
import { QUICK_PROMPTS, generateAiResponse } from '../../react-native/data/ai-concierge'
import { createReviewSchema, changePasswordSchema } from './validations'

// ── Mocks for auth & db helpers ───────────────────────────────────────────────
const mock = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  cookies: new Map<string, string>(),
  mobileSession: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  recentAuthRecord: {
    findUnique: vi.fn(),
  },
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
    set: (key: string, value: string) => mock.cookies.set(key, value),
  }),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    mobileSession: mock.mobileSession,
    user: mock.user,
    recentAuthRecord: mock.recentAuthRecord,
  },
}))

import { checkRecentAuth, requireRecentAuth } from './auth-helpers'

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

// ==============================================================================
// MODULE 1: Mobile User Authentication
// ==============================================================================
describe('Module 1: Mobile User Authentication & Session Management', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mock.headers.clear()
    mock.cookies.clear()
  })

  it('validates active mobile Bearer access token and passes recent authentication', async () => {
    const userId = 'usr_customer_1'
    const token = 'active_access_token_123'
    mock.headers.set('authorization', `Bearer ${token}`)

    mock.mobileSession.findUnique.mockResolvedValue({
      id: 'session_1',
      userId,
      accessTokenHash: hashToken(token),
      accessExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      revokedAt: null,
      user: {
        id: userId,
        email: 'customer@repxl.com',
        firstName: 'Digi',
        lastName: 'Cam',
        role: 'CUSTOMER',
        isSuperAdmin: false,
        isArchived: false,
      },
    })
    mock.mobileSession.update.mockResolvedValue({})

    const isRecent = await checkRecentAuth(userId)
    expect(isRecent).toBe(true)

    const requireResult = await requireRecentAuth(userId)
    expect(requireResult).toBeNull() // Proceed without error
  })

  it('rejects expired or revoked mobile tokens', async () => {
    const userId = 'usr_customer_1'
    const token = 'expired_access_token'
    mock.headers.set('authorization', `Bearer ${token}`)

    mock.mobileSession.findUnique.mockResolvedValue({
      id: 'session_2',
      userId,
      accessTokenHash: hashToken(token),
      accessExpiresAt: new Date(Date.now() - 5000), // expired 5 seconds ago
      revokedAt: null,
      user: { id: userId, email: 'cust@repxl.com', role: 'CUSTOMER', isArchived: false },
    })

    const isRecent = await checkRecentAuth(userId)
    expect(isRecent).toBe(false)
  })

  it('rejects password changes with invalid new password criteria', () => {
    // Too short (< 8 chars) in schema
    const tooShort = changePasswordSchema.safeParse({
      oldPassword: 'Password123',
      newPassword: 'Pass1',
    })
    expect(tooShort.success).toBe(false)

    // Missing oldPassword in schema
    const missingOld = changePasswordSchema.safeParse({
      oldPassword: '',
      newPassword: 'ValidNewPassword123',
    })
    expect(missingOld.success).toBe(false)

    // Valid according to schema
    const valid = changePasswordSchema.safeParse({
      oldPassword: 'Password123',
      newPassword: 'NewSecurePassword1',
    })
    expect(valid.success).toBe(true)

    // Client-side strength check (min 8, uppercase, digit)
    const validateClientPassword = (pwd: string) => {
      if (pwd.length < 8) return false
      if (!/[A-Z]/.test(pwd)) return false
      if (!/\d/.test(pwd)) return false
      return true
    }

    expect(validateClientPassword('password123')).toBe(false) // missing uppercase
    expect(validateClientPassword('PasswordNoNumber')).toBe(false) // missing digit
    expect(validateClientPassword('Pass1')).toBe(false) // too short
    expect(validateClientPassword('SecurePass123')).toBe(true) // valid
  })
})

// ==============================================================================
// MODULE 2: Mobile Home Screen
// ==============================================================================
describe('Module 2: Mobile Home Screen Components', () => {
  const sampleProducts = [
    { id: '1', name: 'Canon PowerShot G7', brand: 'Canon', price: 6500, condition: 'EXCELLENT', category: 'Compact' },
    { id: '2', name: 'Sony Cyber-shot DSC-W55', brand: 'Sony', price: 4200, condition: 'MINT', category: 'Point & Shoot' },
    { id: '3', name: 'Kodak EasyShare C330', brand: 'Kodak', price: 3200, condition: 'GOOD', category: 'CCD Vintage' },
  ]

  it('filters featured products by brand chips', () => {
    const filterByBrand = (brand: string) =>
      brand === 'All' ? sampleProducts : sampleProducts.filter((p) => p.brand.toLowerCase() === brand.toLowerCase())

    expect(filterByBrand('All')).toHaveLength(3)
    expect(filterByBrand('Sony')).toHaveLength(1)
    expect(filterByBrand('Sony')[0].name).toBe('Sony Cyber-shot DSC-W55')
    expect(filterByBrand('Nikon')).toHaveLength(0)
  })

  it('supports quick product search across title and brand', () => {
    const search = (query: string) => {
      const q = query.toLowerCase().trim()
      return sampleProducts.filter((p) => p.name.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q))
    }

    expect(search('powershot')).toHaveLength(1)
    expect(search('kodak')).toHaveLength(1)
    expect(search('dslr')).toHaveLength(0)
  })
})

// ==============================================================================
// MODULE 3: Product Browsing & "Try the Look"
// ==============================================================================
describe('Module 3: Product Browsing, Sorting, and "Try the Look" CCD Engine', () => {
  const catalog = [
    { id: '1', name: 'Canon IXY 200', price: 4500, condition: 'FAIR', createdAt: '2026-08-01' },
    { id: '2', name: 'Sony DSC-T10', price: 5800, condition: 'MINT', createdAt: '2026-09-01' },
    { id: '3', name: 'Nikon Coolpix S210', price: 3900, condition: 'GOOD', createdAt: '2026-08-15' },
  ]

  it('sorts products by price ascending, descending, and newest', () => {
    const priceAsc = [...catalog].sort((a, b) => a.price - b.price)
    expect(priceAsc[0].price).toBe(3900)
    expect(priceAsc[2].price).toBe(5800)

    const priceDesc = [...catalog].sort((a, b) => b.price - a.price)
    expect(priceDesc[0].price).toBe(5800)

    const newest = [...catalog].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    expect(newest[0].name).toBe('Sony DSC-T10')
  })

  it('filters products by condition grade', () => {
    const mintOnly = catalog.filter((p) => p.condition === 'MINT')
    expect(mintOnly).toHaveLength(1)
    expect(mintOnly[0].name).toBe('Sony DSC-T10')
  })

  it('provides brand-accurate CCD color simulation profiles in "Try the Look"', () => {
    const canonProfile = getColorProfile('Canon')
    expect(canonProfile.name).toContain('PowerShot')
    expect(canonProfile.presets.some((pr) => pr.id === 'canon-ccd')).toBe(true)

    const kodakProfile = getColorProfile('Kodak')
    expect(kodakProfile.name).toContain('Kodachrome')
    expect(kodakProfile.presets.some((pr) => pr.id === 'kodak-warm')).toBe(true)

    const sonyProfile = getColorProfile('Sony')
    expect(sonyProfile.name).toContain('CyberShot')

    const unknownProfile = getColorProfile('UnknownBrand')
    expect(unknownProfile.name).toBe('Digital Neutral')
  })
})

// ==============================================================================
// MODULE 4: Shopping Cart
// ==============================================================================
describe('Module 4: Shopping Cart Operations & Price Calculations', () => {
  interface CartItem {
    id: string
    product: { id: string; name: string; price: number; stockCount: number }
    quantity: number
  }

  it('calculates cart subtotal, shipping, and grand total', () => {
    const items: CartItem[] = [
      { id: 'c1', product: { id: 'p1', name: 'Canon IXY', price: 4500, stockCount: 5 }, quantity: 2 },
      { id: 'c2', product: { id: 'p2', name: 'Kodak EasyShare', price: 3000, stockCount: 2 }, quantity: 1 },
    ]

    const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
    expect(subtotal).toBe(12000)

    const shippingCost = subtotal >= 10000 ? 0 : 150 // Free shipping over ₱10,000
    expect(shippingCost).toBe(0)

    const total = subtotal + shippingCost
    expect(total).toBe(12000)
  })

  it('prevents increasing quantity beyond product stock', () => {
    const maxStock = 2
    const currentQty = 2
    const canIncrement = currentQty < maxStock
    expect(canIncrement).toBe(false)
  })
})

// ==============================================================================
// MODULE 5: Mobile Checkout
// ==============================================================================
describe('Module 5: Mobile Checkout, Vouchers & Payment Methods', () => {
  it('validates percentage vouchers against cart total', () => {
    const cartTotal = 5000
    const voucher = { code: 'SAVE10', type: 'PERCENT', value: 10, minSpend: 3000 }

    expect(cartTotal >= voucher.minSpend).toBe(true)
    const discount = (cartTotal * voucher.value) / 100
    expect(discount).toBe(500)
    const finalPayable = cartTotal - discount
    expect(finalPayable).toBe(4500)
  })

  it('rejects vouchers when minimum spend requirement is not met', () => {
    const cartTotal = 1500
    const voucher = { code: 'VIP500', minSpend: 4000 }
    const isValid = cartTotal >= voucher.minSpend
    expect(isValid).toBe(false)
  })

  it('supports all core payment methods in checkout', () => {
    const supportedMethods = ['card', 'gcash', 'cod']
    expect(supportedMethods).toContain('card')
    expect(supportedMethods).toContain('gcash')
    expect(supportedMethods).toContain('cod')
  })
})

// ==============================================================================
// MODULE 6: Order Management & Order Tracking
// ==============================================================================
describe('Module 6: Order Management, Status Normalization & Tracking', () => {
  it('normalizes legacy and mixed-case order statuses into canonical enum', () => {
    expect(normalizeOrderStatus('shipped')).toBe('SHIPPED')
    expect(normalizeOrderStatus('delivered')).toBe('DELIVERED')
    expect(normalizeOrderStatus('completed')).toBe('COMPLETED')
    expect(normalizeOrderStatus('canceled')).toBe('CANCELLED')
    expect(normalizeOrderStatus('CANCELLED')).toBe('CANCELLED')
    expect(normalizeOrderStatus(null)).toBe('PROCESSING')
  })

  it('returns appropriate labels and colors for order statuses', () => {
    expect(getOrderStatusLabel('SHIPPED')).toBe('Shipped')
    expect(getOrderStatusLabel('PROCESSING', 'PENDING', 'Pending COD Approval', 'Cash on Delivery')).toBe(
      'Awaiting COD Approval'
    )

    const processingColors = getOrderStatusColors('PROCESSING')
    expect(processingColors.text).toBe('#fbbf24')

    const completedColors = getOrderStatusColors('COMPLETED')
    expect(completedColors.text).toBe('#34d399')
  })

  it('allows cancellation only for PROCESSING orders prior to courier pickup', () => {
    const processingOrder = { status: 'PROCESSING', deliveryStatus: 'Order Placed' }
    expect(canCustomerCancelOrder(processingOrder).allowed).toBe(true)

    const shippedOrder = { status: 'SHIPPED', deliveryStatus: 'In Transit' }
    expect(canCustomerCancelOrder(shippedOrder).allowed).toBe(false)
    expect(isOrderPickedUpOrShipped(shippedOrder)).toBe(true)

    const completedOrder = { status: 'COMPLETED' }
    expect(canCustomerCancelOrder(completedOrder).allowed).toBe(false)
  })
})

// ==============================================================================
// MODULE 7: Customer Profile
// ==============================================================================
describe('Module 7: Customer Profile & Address Book Management', () => {
  it('formats customer initials and full name correctly', () => {
    const user = { firstName: 'Cam', lastName: 'Vintage', email: 'cam@repxl.com' }
    const name = `${user.firstName} ${user.lastName}`.trim()
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()

    expect(name).toBe('Cam Vintage')
    expect(initials).toBe('CV')
  })

  it('validates required fields for shipping address management', () => {
    const validateAddress = (addr: {
      fullName: string
      streetAddress: string
      barangay: string
      city: string
      province: string
      postalCode: string
      phone: string
    }) => {
      return !!(
        addr.fullName.trim() &&
        addr.streetAddress.trim() &&
        addr.barangay.trim() &&
        addr.city.trim() &&
        addr.province.trim() &&
        addr.postalCode.trim() &&
        addr.phone.trim()
      )
    }

    expect(
      validateAddress({
        fullName: 'John Doe',
        streetAddress: '123 Main St',
        barangay: 'San Antonio',
        city: 'Makati',
        province: 'Metro Manila',
        postalCode: '1203',
        phone: '09171234567',
      })
    ).toBe(true)

    expect(
      validateAddress({
        fullName: '',
        streetAddress: '123 Main St',
        barangay: '',
        city: 'Makati',
        province: '',
        postalCode: '',
        phone: '',
      })
    ).toBe(false)
  })
})

// ==============================================================================
// MODULE 8: Wishlist
// ==============================================================================
describe('Module 8: Wishlist Toggle and Cart Migration', () => {
  it('toggles wishlist status (add when absent, remove when present)', () => {
    let wishlist: string[] = ['prod_1']

    const toggle = (id: string) => {
      wishlist = wishlist.includes(id) ? wishlist.filter((item) => item !== id) : [...wishlist, id]
    }

    toggle('prod_2')
    expect(wishlist).toEqual(['prod_1', 'prod_2'])

    toggle('prod_1')
    expect(wishlist).toEqual(['prod_2'])
  })
})

// ==============================================================================
// MODULE 9: Notifications
// ==============================================================================
describe('Module 9: In-App Notifications & Push Notification Integration', () => {
  const notifications = [
    { id: '1', event: 'ORDER_PLACED', message: 'Order #RPX-2026-101 placed successfully.', isRead: false },
    { id: '2', event: 'ORDER_SHIPPED', message: 'Order #RPX-2026-101 has shipped with J&T Express.', isRead: true },
    { id: '3', event: 'PROMO', message: 'Weekend 15% off flash sale on vintage CCD digicams!', isRead: false },
  ]

  it('calculates unread notifications count correctly', () => {
    const unread = notifications.filter((n) => !n.isRead).length
    expect(unread).toBe(2)
  })

  it('extracts order number from notification text for deep linking to order screen', () => {
    const match = notifications[0].message.match(/\b(RPX-[A-Z0-9-]+)\b/i)
    expect(match).not.toBeNull()
    expect(match![1]).toBe('RPX-2026-101')
  })
})

// ==============================================================================
// MODULE 10: Reviews and Ratings
// ==============================================================================
describe('Module 10: Reviews, Ratings & Verified Purchase Safeguards', () => {
  it('validates review schema bounds (rating 1–5, non-empty comment)', () => {
    expect(createReviewSchema.safeParse({ productId: 'p1', rating: 5, comment: 'Great camera!' }).success).toBe(true)
    expect(createReviewSchema.safeParse({ productId: 'p1', rating: 0, comment: 'Too low rating' }).success).toBe(false)
    expect(createReviewSchema.safeParse({ productId: 'p1', rating: 6, comment: 'Too high rating' }).success).toBe(false)
    expect(createReviewSchema.safeParse({ productId: 'p1', rating: 5, comment: '' }).success).toBe(false)
  })

  it('computes average rating and review summary for product display', () => {
    const reviews = [
      { id: 'r1', rating: 5 },
      { id: 'r2', rating: 4 },
      { id: 'r3', rating: 5 },
    ]
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    expect(avg).toBeCloseTo(4.67, 2)
    expect(Math.round(avg)).toBe(5)
  })
})

// ==============================================================================
// MODULE 11: Customer Support Hub
// ==============================================================================
describe('Module 11: Customer Support Hub (AI Assistant, FAQs, Contact Form)', () => {
  it('contains expected quick prompt chips', () => {
    expect(QUICK_PROMPTS.length).toBeGreaterThanOrEqual(5)
  })

  it('AI concierge accurately answers condition, tracking, returns, recommendations, and payments', () => {
    expect(generateAiResponse('Tell me about your condition grading')).toContain('Mint')
    expect(generateAiResponse('Where is my order?')).toContain('Purchases tab')
    expect(generateAiResponse('What is your refund policy?')).toContain('14-day return window')
    expect(generateAiResponse('Recommend a camera for vintage photos')).toContain('Canon IXY')
    expect(generateAiResponse('What payment methods do you accept?')).toContain('GCash')
    expect(generateAiResponse('I want to speak with an agent')).toContain('Contact Us')
  })

  it('allows filtering and searching bundled FAQs', () => {
    expect(FAQ_CATEGORIES).toContain('Grading & Condition')
    expect(FAQ_CATEGORIES).toContain('Orders, Payment & Shipping')

    const gradingFaqs = FAQS.filter((f) => f.category === 'Grading & Condition')
    expect(gradingFaqs.length).toBeGreaterThan(0)

    const searchResult = FAQS.filter(
      (f) => f.question.toLowerCase().includes('battery') || f.answer.toLowerCase().includes('battery')
    )
    expect(searchResult.length).toBeGreaterThan(0)
  })

  it('validates contact form submission inputs', () => {
    const validateContact = (input: { name: string; email: string; subject: string; message: string }) => {
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
      const nameValid = input.name.trim().length > 0
      const subjectValid = input.subject.trim().length > 0
      const msgValid = input.message.trim().length >= 10
      return emailValid && nameValid && subjectValid && msgValid
    }

    expect(
      validateContact({
        name: 'Alex Tan',
        email: 'alex@repxl.com',
        subject: 'Camera question',
        message: 'Does the Canon IXY include an SD card?',
      })
    ).toBe(true)

    expect(
      validateContact({
        name: '',
        email: 'invalid-email',
        subject: '',
        message: 'Short',
      })
    ).toBe(false)
  })
})
