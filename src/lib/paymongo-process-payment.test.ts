import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  createPaymentMethod,
  attachPaymentMethod,
} from './paymongo'
import { POST } from '@/app/api/checkout/process-payment/route'
import * as authHelpers from '@/lib/auth-helpers'
import * as paymongoLib from '@/lib/paymongo'
import * as purchaseFinalization from '@/lib/purchase-finalization'
import { prisma } from '@/lib/prisma'

process.env.PAYMONGO_SECRET_KEY = 'sk_test_mock_secret'

vi.mock('@/lib/auth-helpers', () => ({
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/purchase-finalization', () => ({
  finalizePaidOrder: vi.fn().mockResolvedValue(true),
  deductInventory: vi.fn().mockResolvedValue(undefined),
  InsufficientStockError: class InsufficientStockError extends Error {},
}))

vi.mock('@/lib/prisma', () => {
  const mockTx = {
    order: {
      create: vi.fn(),
    },
    voucher: {
      updateMany: vi.fn(),
    },
    cartItem: {
      deleteMany: vi.fn(),
    },
  }

  return {
    prisma: {
      cartItem: {
        findMany: vi.fn(),
        deleteMany: vi.fn(),
      },
      voucher: {
        findUnique: vi.fn(),
      },
      order: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) => cb(mockTx)),
      _mockTx: mockTx,
    },
  }
})

describe('PayMongo In-App Payment Methods & Attach', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('createPaymentMethod sends card details correctly to PayMongo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: 'pm_card_123', type: 'payment_method' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createPaymentMethod({
      type: 'card',
      card: {
        cardNumber: '4111111111111111',
        expMonth: 12,
        expYear: 2028,
        cvc: '123',
      },
      billing: {
        name: 'Juan Dela Cruz',
        email: 'juan@example.com',
      },
      metadata: { orderNumber: 'RPX-123' },
    })

    expect(result.id).toBe('pm_card_123')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.paymongo.com/v1/payment_methods')
    expect(opts.method).toBe('POST')

    const body = JSON.parse(opts.body as string)
    expect(body.data.attributes.type).toBe('card')
    expect(body.data.attributes.details.card_number).toBe('4111111111111111')
    expect(body.data.attributes.details.exp_month).toBe(12)
    expect(body.data.attributes.details.exp_year).toBe(2028)
    expect(body.data.attributes.details.cvc).toBe('123')
    expect(body.data.attributes.billing.name).toBe('Juan Dela Cruz')
  })

  it('createPaymentMethod sends gcash wallet type correctly to PayMongo', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: { id: 'pm_gcash_456', type: 'payment_method' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await createPaymentMethod({
      type: 'gcash',
      billing: {
        name: 'Maria Santos',
        email: 'maria@example.com',
        phone: '09171234567',
      },
    })

    expect(result.id).toBe('pm_gcash_456')
    const [, opts] = fetchMock.mock.calls[0]
    const body = JSON.parse(opts.body as string)
    expect(body.data.attributes.type).toBe('gcash')
    expect(body.data.attributes.billing.phone).toBe('09171234567')
  })

  it('attachPaymentMethod attaches method and returns intent attributes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          id: 'pi_test_789',
          attributes: {
            status: 'succeeded',
            client_key: 'pi_client_key',
          },
        },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await attachPaymentMethod('pi_test_789', {
      paymentMethodId: 'pm_card_123',
      clientKey: 'pi_client_key',
      returnUrl: 'https://repxl.com/checkout/success',
    })

    expect(result.id).toBe('pi_test_789')
    expect(result.attributes.status).toBe('succeeded')
    const [url, opts] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.paymongo.com/v1/payment_intents/pi_test_789/attach')
    const body = JSON.parse(opts.body as string)
    expect(body.data.attributes.payment_method).toBe('pm_card_123')
    expect(body.data.attributes.client_key).toBe('pi_client_key')
  })
})

describe('POST /api/checkout/process-payment', () => {
  const mockUser = {
    id: 'user_cust_1',
    email: 'buyer@repxl.com',
    firstName: 'Buyer',
    lastName: 'Customer',
  }

  const mockCartItems = [
    {
      id: 'cart_1',
      productId: 'prod_1',
      quantity: 1,
      product: {
        id: 'prod_1',
        name: 'Canon IXY Digital 930 IS',
        price: 8500,
        stock: 5,
        slug: 'canon-ixy-930-is',
      },
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as any)
    vi.mocked(prisma.cartItem.findMany).mockResolvedValue(mockCartItems as any)
    vi.mocked((prisma as any)._mockTx.order.create).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-MOCK-1',
      createdAt: new Date(),
      total: 8650,
      subtotal: 8500,
      shippingCost: 150,
      discount: 0,
      paymentMethod: 'Cash on Delivery',
      courierName: 'J&T Express',
      fullName: 'Buyer Customer',
      address: '123 Main St',
      city: 'Manila',
      province: 'Metro Manila',
      postalCode: '1000',
      items: mockCartItems,
    })
    vi.mocked(prisma.order.create).mockResolvedValue({
      id: 'ord_1',
      orderNumber: 'RPX-MOCK-1',
      createdAt: new Date(),
      total: 8650,
      subtotal: 8500,
      shippingCost: 150,
      discount: 0,
      paymentMethod: 'Credit / Debit Card',
      paymentStatus: 'PENDING',
      courierName: 'J&T Express',
      fullName: 'Buyer Customer',
      address: '123 Main St',
      city: 'Manila',
      province: 'Metro Manila',
      postalCode: '1000',
      items: mockCartItems,
    } as any)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects unauthenticated requests with 401', async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null)
    const req = new NextRequest('http://localhost:3000/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({ fullName: 'Nobody' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('processes Cash on Delivery order directly without PayMongo', async () => {
    const req = new NextRequest('http://localhost:3000/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Buyer Customer',
        address: '123 Main St',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Cash on Delivery',
        shippingCost: 150,
        selectedProductIds: ['canon-ixy-930-is'],
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('PROCESSING')
    expect(json.data.isPaid).toBe(false)
    expect(purchaseFinalization.deductInventory).toHaveBeenCalledTimes(1)
  })

  it('processes Card payment with direct success (non-3DS) and finalizes order', async () => {
    vi.spyOn(paymongoLib, 'isPaymongoConfigured').mockReturnValue(true)
    vi.spyOn(paymongoLib, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_auto_1',
      attributes: {
        status: 'awaiting_payment_method',
        amount: 865000,
        currency: 'PHP',
        client_key: 'pi_auto_1_client_key',
      },
    })
    vi.spyOn(paymongoLib, 'createPaymentMethod').mockResolvedValue({
      id: 'pm_card_auto_1',
      type: 'card',
    })
    vi.spyOn(paymongoLib, 'attachPaymentMethod').mockResolvedValue({
      id: 'pi_auto_1',
      attributes: {
        status: 'succeeded',
        amount: 865000,
        currency: 'PHP',
        client_key: 'pi_auto_1_client_key',
      },
    })

    const req = new NextRequest('http://localhost:3000/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Buyer Customer',
        address: '123 Main St',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
        selectedProductIds: ['canon-ixy-930-is'],
        card: {
          cardNumber: '4111111111111111',
          expMonth: 12,
          expYear: 2028,
          cvc: '123',
          cardholderName: 'Buyer Customer',
        },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.isPaid).toBe(true)
    expect(json.data.status).toBe('PAID')
    expect(purchaseFinalization.finalizePaidOrder).toHaveBeenCalled()
  })

  it('returns AWAITING_NEXT_ACTION with nextActionUrl when 3DS is required', async () => {
    vi.spyOn(paymongoLib, 'isPaymongoConfigured').mockReturnValue(true)
    vi.spyOn(paymongoLib, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_3ds_1',
      attributes: {
        status: 'awaiting_payment_method',
        amount: 865000,
        currency: 'PHP',
        client_key: 'pi_3ds_1_client_key',
      },
    })
    vi.spyOn(paymongoLib, 'createPaymentMethod').mockResolvedValue({
      id: 'pm_card_3ds_1',
      type: 'card',
    })
    vi.spyOn(paymongoLib, 'attachPaymentMethod').mockResolvedValue({
      id: 'pi_3ds_1',
      attributes: {
        status: 'awaiting_next_action',
        amount: 865000,
        currency: 'PHP',
        client_key: 'pi_3ds_1_client_key',
        next_action: {
          type: 'redirect',
          redirect: {
            url: 'https://api.paymongo.com/v1/redirect?auth=mock_3ds',
          },
        },
      },
    })

    const req = new NextRequest('http://localhost:3000/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Buyer Customer',
        address: '123 Main St',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
        selectedProductIds: ['canon-ixy-930-is'],
        card: {
          cardNumber: '4000000000000002',
          expMonth: 10,
          expYear: 2029,
          cvc: '321',
        },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.data.isPaid).toBe(false)
    expect(json.data.status).toBe('AWAITING_NEXT_ACTION')
    expect(json.data.nextActionUrl).toBe('https://api.paymongo.com/v1/redirect?auth=mock_3ds')
  })

  it('surfaces PayMongo error when card is declined or invalid', async () => {
    vi.spyOn(paymongoLib, 'isPaymongoConfigured').mockReturnValue(true)
    vi.spyOn(paymongoLib, 'createPaymentIntent').mockResolvedValue({
      id: 'pi_fail_1',
      attributes: {
        status: 'awaiting_payment_method',
        amount: 865000,
        currency: 'PHP',
        client_key: 'pi_fail_1_client_key',
      },
    })
    vi.spyOn(paymongoLib, 'createPaymentMethod').mockRejectedValue(
      new Error('Card number is invalid.')
    )

    const req = new NextRequest('http://localhost:3000/api/checkout/process-payment', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Buyer Customer',
        address: '123 Main St',
        city: 'Manila',
        province: 'Metro Manila',
        postalCode: '1000',
        courierName: 'J&T Express',
        courierEstimate: '2-3 days',
        paymentMethod: 'Credit / Debit Card',
        shippingCost: 150,
        selectedProductIds: ['canon-ixy-930-is'],
        card: {
          cardNumber: '4111111111111112',
          expMonth: 1,
          expYear: 2028,
          cvc: '123',
        },
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.success).toBe(false)
    expect(json.error).toBe('Card number is invalid.')
  })
})
