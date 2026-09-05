import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/prisma', async () => {
  const { PrismaClient } = await import('@prisma/client')
  return {
    prisma: new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL ?? 'postgresql://localhost/unused',
        },
      },
    }),
  }
})
vi.mock('@/lib/notifications', () => ({
  emitNotification: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/order-email', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAdmin: vi.fn(),
}))
vi.mock('@/lib/paymongo', () => ({
  verifyWebhookSignature: vi.fn(() => ({ valid: true })),
  isPaymongoConfigured: () => true,
  retrievePaymentIntent: vi
    .fn()
    .mockResolvedValue({ attributes: { status: 'succeeded' } }),
  retrieveCheckoutSession: vi.fn().mockResolvedValue({
    attributes: { payment_intent: { attributes: { status: 'succeeded' } } },
  }),
}))
import { prisma } from '@/lib/prisma'
import { emitNotification } from '@/lib/notifications'
import { getCurrentUser } from '@/lib/auth-helpers'
import {
  finalizePaidOrder,
  deductInventory,
  InsufficientStockError,
} from './purchase-finalization'
import { POST as webhook } from '@/app/api/webhooks/paymongo/route'
import { POST as verify } from '@/app/api/checkout/verify/route'
import { POST as createOrder } from '@/app/api/orders/route'

// Explicit isolated database only; never use DATABASE_URL or the developer's .env.
const url = process.env.TEST_DATABASE_URL
if (url) {
  const parsed = new URL(url)
  if (
    !['localhost', '127.0.0.1'].includes(parsed.hostname) ||
    parsed.pathname !== '/repixl_concurrency_test'
  )
    throw new Error('Use an isolated local repixl_concurrency_test database')
}
const productData = {
  slug: 'camera',
  name: 'Camera',
  brand: 'Test',
  series: 'Test',
  price: 100,
  condition: 'MINT' as const,
  image: '',
  description: '',
  megapixels: 10,
  zoom: '',
  storage: '',
  year: 2025,
}
async function fixture(stock = 10, quantity = 1, secondCustomer = false) {
  const user = await prisma.user.create({
    data: {
      email: `${crypto.randomUUID()}@example.test`,
      password: 'not-a-credential',
      firstName: 'Test',
      lastName: 'Buyer',
    },
  })
  const product = await prisma.product.upsert({
    where: { slug: 'camera' },
    create: { ...productData, stock },
    update: {},
  })
  const order = await prisma.order.create({
    data: {
      orderNumber: crypto.randomUUID(),
      userId: user.id,
      subtotal: 100,
      shippingCost: 0,
      total: 100,
      courierName: 'Test',
      courierEstimate: '',
      paymentMethod: 'card',
      paymentIntentId: crypto.randomUUID(),
      fullName: 'Test Buyer',
      address: 'Test',
      city: 'Test',
      postalCode: '1000',
      items: { create: { productId: product.id, quantity, price: 100 } },
    },
  })
  await prisma.cartItem.create({
    data: { userId: user.id, productId: product.id, quantity: quantity + 2 },
  })
  if (!secondCustomer) vi.mocked(getCurrentUser).mockResolvedValue(user)
  return { user, product, order }
}
function event(orderNumber: string) {
  return new NextRequest('http://localhost/api/webhooks/paymongo', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        id: 'same-event',
        attributes: {
          type: 'payment_intent.succeeded',
          data: { attributes: { metadata: { orderNumber } } },
        },
      },
    }),
  })
}
function verification(orderNumber: string) {
  return new NextRequest('http://localhost/api/checkout/verify', {
    method: 'POST',
    body: JSON.stringify({ orderNumber }),
  })
}

describe.skipIf(!url)('purchase finalization against PostgreSQL', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await prisma.user.deleteMany()
    await prisma.product.deleteMany()
    await prisma.voucher.deleteMany()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('normal successful payment updates stock and cart once', async () => {
    const { order, product, user } = await fixture()
    expect(await finalizePaidOrder(order.orderNumber)).toBe(true)
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus
    ).toBe('PAID')
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(9)
    expect(
      (await prisma.cartItem.findFirstOrThrow({ where: { userId: user.id } }))
        .quantity
    ).toBe(2)
    expect(emitNotification).toHaveBeenCalledTimes(1)
  })
  it('duplicate webhook deliveries finalize and notify once', async () => {
    const { order, product } = await fixture()
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => webhook(event(order.orderNumber)))
    )
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200))
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(9)
    expect(emitNotification).toHaveBeenCalledTimes(1)
  })
  it('simultaneous webhook and verification share the database claim', async () => {
    const { order, product, user } = await fixture()
    const responses = await Promise.all([
      webhook(event(order.orderNumber)),
      verify(verification(order.orderNumber)),
    ])
    expect(responses.map((r) => r.status)).toEqual([200, 200])
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(9)
    expect(
      (await prisma.cartItem.findFirstOrThrow({ where: { userId: user.id } }))
        .quantity
    ).toBe(2)
    expect(emitNotification).toHaveBeenCalledTimes(1)
    await verify(verification(order.orderNumber))
    expect(
      (await prisma.cartItem.findFirstOrThrow({ where: { userId: user.id } }))
        .quantity
    ).toBe(2)
    expect(emitNotification).toHaveBeenCalledTimes(1)
  })
  it('two customers cannot both finalize the final unit', async () => {
    const first = await fixture(1)
    const second = await fixture(1, 1, true)
    const results = await Promise.allSettled([
      finalizePaidOrder(first.order.orderNumber),
      finalizePaidOrder(second.order.orderNumber),
    ])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(await prisma.order.count({ where: { paymentStatus: 'PAID' } })).toBe(
      1
    )
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: first.product.id },
        })
      ).stock
    ).toBe(0)
  })
  it('insufficient stock rolls back state and cart, and failed webhook can retry', async () => {
    const { order, product, user } = await fixture(1, 2)
    expect((await webhook(event(order.orderNumber))).status).toBe(500)
    expect((await verify(verification(order.orderNumber))).status).toBe(409)
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus
    ).toBe('PENDING')
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(1)
    expect(
      (await prisma.cartItem.findFirstOrThrow({ where: { userId: user.id } }))
        .quantity
    ).toBe(4)
    expect(emitNotification).not.toHaveBeenCalled()
    await prisma.product.update({
      where: { id: product.id },
      data: { stock: 2 },
    })
    expect((await webhook(event(order.orderNumber))).status).toBe(200)
    expect(emitNotification).toHaveBeenCalledTimes(1)
  })
  it('rolls back earlier product deductions when a later item is unavailable', async () => {
    const { order, product } = await fixture(1)
    const other = await prisma.product.create({
      data: { ...productData, id: 'zzzz', slug: 'other', stock: 0 },
    })
    await prisma.orderItem.create({
      data: { orderId: order.id, productId: other.id, quantity: 1, price: 100 },
    })
    await expect(finalizePaidOrder(order.orderNumber)).rejects.toBeInstanceOf(
      InsufficientStockError
    )
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(1)
  })
  it.each(['FAILED', 'REFUNDED'] as const)(
    'does not resurrect %s payments',
    async (paymentStatus) => {
      const { order, product } = await fixture()
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus },
      })
      expect(await finalizePaidOrder(order.orderNumber)).toBe(false)
      expect(
        (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
          .stock
      ).toBe(10)
    }
  )
  it('does not resurrect cancelled orders or deduct direct orders twice', async () => {
    const { order } = await fixture()
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
    })
    expect(await finalizePaidOrder(order.orderNumber)).toBe(false)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PROCESSING', paymentIntentId: null },
    })
    expect(await finalizePaidOrder(order.orderNumber)).toBe(false)
  })
  it('direct purchase inventory transactions reject competing final-unit deductions', async () => {
    const { product } = await fixture(1)
    const buy = () =>
      prisma.$transaction((tx) =>
        deductInventory(tx, [{ productId: product.id, quantity: 1 }])
      )
    const results = await Promise.allSettled([buy(), buy()])
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1)
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: product.id } }))
        .stock
    ).toBe(0)
  })
  it('counts voucher usage only once across duplicate finalizers', async () => {
    const { order } = await fixture()
    await prisma.voucher.create({
      data: {
        code: 'TEST',
        discountType: 'FIXED',
        discountValue: 1,
        usageLimit: 10,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 86400000),
      },
    })
    await prisma.order.update({
      where: { id: order.id },
      data: { voucherCode: 'TEST' },
    })
    await Promise.all([
      finalizePaidOrder(order.orderNumber),
      finalizePaidOrder(order.orderNumber),
    ])
    expect(
      (await prisma.voucher.findUniqueOrThrow({ where: { code: 'TEST' } })).used
    ).toBe(1)
  })
  it('verifies hosted checkout using its session, then finalizes once', async () => {
    const { order } = await fixture()
    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: null, paymentSessionId: 'cs_test' },
    })
    expect((await verify(verification(order.orderNumber))).status).toBe(200)
    expect(
      (await prisma.order.findUniqueOrThrow({ where: { id: order.id } }))
        .paymentStatus
    ).toBe('PAID')
  })
  it('two direct order requests cannot create purchases for the final unit', async () => {
    const first = await fixture(1)
    const second = await fixture(1, 1, true)
    await prisma.order.deleteMany()
    await prisma.cartItem.updateMany({ data: { quantity: 1 } })
    vi.mocked(getCurrentUser)
      .mockResolvedValueOnce(first.user)
      .mockResolvedValueOnce(second.user)
    const request = () =>
      new NextRequest('http://localhost/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          fullName: 'Test',
          address: 'Test',
          city: 'Test',
          postalCode: '1000',
          courierName: 'Test',
          courierEstimate: '1 day',
          paymentMethod: 'cash',
          shippingCost: 0,
        }),
      })
    const responses = await Promise.all([
      createOrder(request()),
      createOrder(request()),
    ])
    expect(responses.filter((r) => r.status === 201)).toHaveLength(1)
    expect(
      responses.filter((r) => r.status === 409 || r.status === 400)
    ).toHaveLength(1)
    expect(await prisma.order.count()).toBe(1)
    expect(
      (
        await prisma.product.findUniqueOrThrow({
          where: { id: first.product.id },
        })
      ).stock
    ).toBe(0)
    expect(await prisma.cartItem.count()).toBe(1)
  })
})
