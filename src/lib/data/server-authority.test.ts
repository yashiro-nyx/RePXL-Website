import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { authService } from './authService'
import { addressService } from './addressService'
import { orderService, type CreateOrderInput } from './orderService'
import { cartService } from './cartService'
import { wishlistService } from './wishlistService'
import { reviewService } from './reviewService'
import { productService } from './productService'
import { voucherService } from './voucherService'
import { adminService } from './adminService'
import { clearLegacyAccountStorage } from '@/lib/browser-storage'
import { useAuthStore } from '@/stores/authStore'
import { useOrderHistoryStore } from '@/stores/orderHistoryStore'
import { useAddressStore, type Address } from '@/stores/addressStore'
import { usePaymentStore } from '@/stores/paymentStore'
import { useReviewStore } from '@/stores/reviewStore'
import { useProductStore } from '@/stores/productStore'
import { useCartStore } from '@/stores/cartStore'
import { useWishlistStore } from '@/stores/wishlistStore'

const storage = new Map<string, string>()
const local = {
  get length() {
    return storage.size
  },
  key: (i: number) => Array.from(storage.keys())[i] ?? null,
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage.set(key, value)
  }),
  removeItem: vi.fn((key: string) => {
    storage.delete(key)
  }),
}
const fetchMock = vi.fn()
const email = 'owner@example.com'
const address: Omit<Address, 'id'> = {
  fullName: 'Customer',
  address: 'Street',
  barangay: 'Barangay',
  city: 'City',
  province: 'Province',
  postalCode: '1234',
  phone: '09123456789',
  isDefault: true,
}
const input: CreateOrderInput = {
  ...address,
  courierName: 'Courier',
  courierEstimate: '3 days',
  paymentMethod: 'Card',
  shippingCost: 10,
}
const review = {
  productSlug: 'camera',
  reviewerName: 'Customer',
  reviewerEmail: email,
  rating: 5,
  comment: 'Review',
  date: '2026-09-01',
  verifiedPurchase: false,
}
const voucher = {
  code: 'PROMO',
  discountType: 'fixed' as const,
  discountValue: 1,
  minPurchase: 0,
  maxDiscount: 0,
  usageLimit: 1,
  perUserLimit: 1,
  validFrom: '',
  validUntil: '',
  status: 'active' as const,
  description: '',
}

beforeEach(() => {
  vi.restoreAllMocks()
  storage.clear()
  local.setItem.mockClear()
  local.getItem.mockClear()
  vi.stubGlobal('localStorage', local)
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset().mockRejectedValue(new TypeError('Network unavailable'))
  useAuthStore.setState({
    isLoggedIn: true,
    userEmail: email,
    role: 'customer',
    firstName: 'Original',
    isSuperAdmin: false,
  })
  useOrderHistoryStore.setState({ orders: [], archivedOrders: [] })
  useCartStore.setState({ items: [] })
  useWishlistStore.setState({ slugs: [] })
  useReviewStore.setState({ reviews: [] })
  useProductStore.setState({ products: [] })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const operations: [string, () => Promise<unknown>][] = [
  ['create order', () => orderService.create(input)],
  ['order history', () => orderService.list()],
  ['order status', () => orderService.updateStatus('ORDER', 'Shipped')],
  ['order archive', () => orderService.archive('ORDER')],
  ['order restore', () => orderService.restore('ORDER')],
  ['address list', () => addressService.list(email)],
  ['address create', () => addressService.add(email, address)],
  ['address update', () => addressService.update(email, 'id', address)],
  ['address delete', () => addressService.remove(email, 'id')],
  ['address default', () => addressService.setDefault(email, 'id')],
  ['cart list', () => cartService.list(email)],
  ['cart add', () => cartService.add(email, 'camera', 1)],
  ['cart quantity', () => cartService.setQuantity(email, 'camera', 2)],
  ['cart remove', () => cartService.remove(email, 'camera')],
  ['cart clear', () => cartService.clear(email)],
  ['wishlist list', () => wishlistService.list(email)],
  ['wishlist add', () => wishlistService.add(email, 'camera')],
  ['wishlist remove', () => wishlistService.remove(email, 'camera')],
  ['review list', () => reviewService.listAll([])],
  ['review add', () => reviewService.add(review)],
  ['review update', () => reviewService.update('id', { rating: 1 })],
  ['review remove', () => reviewService.remove('id')],
  ['product list', () => productService.list()],
  ['active catalogue', () => productService.listActive()],
  ['product update', () => productService.update('camera', { stock: 2 })],
  ['product remove', () => productService.remove('camera')],
  ['voucher list', () => voucherService.list([])],
  ['voucher validation', () => voucherService.validate([], 'PROMO', 100)],
  ['voucher create', () => voucherService.create([], voucher)],
  ['voucher remove', () => voucherService.remove([], 'id')],
  ['admin customers', () => adminService.listCustomers()],
  ['admin archive', () => adminService.archiveCustomer('id')],
  ['admin restore', () => adminService.restoreCustomer('id')],
  ['admin logs', () => adminService.logs()],
  [
    'profile save',
    () =>
      authService.updateProfile({
        firstName: 'New',
        lastName: 'Name',
        email,
        phone: '',
      }),
  ],
]
describe.each(['network', '500', '403'])(
  '%s failure never becomes local success',
  (failure) => {
    it.each(operations)(
      '%s rejects without writing browser records',
      async (_name, action) => {
        if (failure !== 'network')
          fetchMock.mockImplementation(async () =>
            Response.json(
              { success: false, error: 'Rejected' },
              { status: Number(failure) }
            )
          )
        await expect(action()).rejects.toThrow()
        expect(local.setItem).not.toHaveBeenCalled()
      }
    )
  }
)

it.each([
  ['password login', () => authService.login(email, 'secret')],
  ['admin login', () => authService.loginAdmin(email, 'secret')],
  [
    'registration',
    () => authService.register('First', 'Last', email, 'secret'),
  ],
  ['Google login', () => authService.oauthLoginOnly(email, 'First', 'Last')],
  [
    'Google registration',
    () => authService.oauthRegisterOnly(email, 'First', 'Last'),
  ],
  ['Google refresh', () => authService.oauthLogin(email, 'First', 'Last')],
  ['password change', () => authService.changePassword(email, 'old', 'new')],
] as const)('%s fails safely during outage', async (_name, action) => {
  storage.set(
    'repixl-users',
    JSON.stringify([
      { email, password: 'secret', role: 'admin', isSuperAdmin: true },
    ])
  )
  expect((await action()).ok).toBe(false)
  expect(local.setItem).not.toHaveBeenCalled()
})

it.each(['hydrate', 'hydrateAdmin'] as const)(
  '%s ignores forged local session records',
  async (method) => {
    storage.set(
      'repixl-admin-session',
      JSON.stringify({
        email,
        role: 'admin',
        loginAt: Date.now(),
        isSuperAdmin: true,
      })
    )
    await useAuthStore.getState()[method]()
    expect(useAuthStore.getState().isLoggedIn).toBe(false)
    expect(useAuthStore.getState().isSuperAdmin).toBe(false)
  }
)
it('does not manufacture a signed-in user after a failed Google bridge', async () => {
  await expect(
    useAuthStore.getState().loginWithOAuth(email, 'First', 'Last')
  ).rejects.toThrow()
  expect(useAuthStore.getState().isLoggedIn).toBe(false)
})
it('does not store passwords or session profiles after successful login', async () => {
  fetchMock.mockResolvedValue(
    Response.json({
      success: true,
      data: {
        id: 'user',
        email,
        firstName: 'First',
        lastName: 'Last',
        role: 'CUSTOMER',
        isSuperAdmin: false,
      },
    })
  )
  expect(await useAuthStore.getState().login(email, 'plaintext-secret')).toBe(
    true
  )
  expect(local.setItem).not.toHaveBeenCalled()
  expect(useAuthStore.getState().isLoggedIn).toBe(true)
})
it('removes legacy sensitive records while preserving safe guest/UX keys', () => {
  const unsafe = [
    'repixl-users',
    'repixl-admin-session',
    'repixl-customer-session',
    'repixl-orders',
    'repixl-reviews',
    `repixl-addresses-${email}`,
    `repixl-payments-${email}`,
    `repixl-birthdate-${email}`,
    `repixl-cart-${email}`,
    `repixl-wishlist-${email}`,
  ]
  const safe = [
    'repixl-theme',
    'repixl-cart-guest',
    'repixl-wishlist-guest',
    'repixl-compare-guest',
  ]
  for (const key of [...unsafe, ...safe]) storage.set(key, 'legacy-data')
  clearLegacyAccountStorage()
  expect(Array.from(storage.keys())).toEqual(safe)
  expect(local.getItem).not.toHaveBeenCalled()
})
it('never adds a fake order to history after failed creation', async () => {
  await expect(
    useOrderHistoryStore.getState().addOrder(input)
  ).rejects.toThrow()
  expect(useOrderHistoryStore.getState().orders).toEqual([])
})
it('does not change the profile after a rejected save', async () => {
  await expect(
    useAuthStore.getState().updateProfile('Changed', 'Last', email, '')
  ).rejects.toThrow()
  expect(useAuthStore.getState().firstName).toBe('Original')
})
it('does not mutate address state before the server accepts the change', async () => {
  useAddressStore.setState({ addresses: [{ ...address, id: 'id' }] })
  await expect(
    useAddressStore
      .getState()
      .updateAddress('id', { ...address, city: 'New City' })
  ).rejects.toThrow()
  expect(useAddressStore.getState().addresses[0].city).toBe('City')
  await expect(useAddressStore.getState().removeAddress('id')).rejects.toThrow()
  expect(useAddressStore.getState().addresses).toHaveLength(1)
})
it('does not leave an optimistic review or shopping mutation after failure', async () => {
  await expect(useReviewStore.getState().addReview(review)).rejects.toThrow()
  await expect(useCartStore.getState().addToCart('camera')).rejects.toThrow()
  await expect(
    useWishlistStore.getState().addToWishlist('camera')
  ).rejects.toThrow()
  expect(useReviewStore.getState().reviews).toEqual([])
  expect(useCartStore.getState().items).toEqual([])
  expect(useWishlistStore.getState().slugs).toEqual([])
})
it('retains explicit guest shopping independently of authenticated server errors', async () => {
  await cartService.add(null, 'camera', 2)
  await wishlistService.add(null, 'camera')
  expect(await cartService.list(null)).toEqual([
    { slug: 'camera', quantity: 2 },
  ])
  expect(await wishlistService.list(null)).toEqual(['camera'])
  expect(fetchMock).not.toHaveBeenCalled()
  await expect(cartService.list(email)).rejects.toThrow()
  await expect(wishlistService.list(email)).rejects.toThrow()
})
it('clears account shopping state on logout/account switch', () => {
  useCartStore.setState({ items: [{ slug: 'camera', quantity: 1 }] })
  useWishlistStore.setState({ slugs: ['camera'] })
  useAddressStore.setState({ addresses: [{ ...address, id: 'id' }] })
  useAuthStore.setState({ userEmail: 'another@example.com' })
  expect(useCartStore.getState().items).toEqual([])
  expect(useWishlistStore.getState().slugs).toEqual([])
  expect(useAddressStore.getState().addresses).toEqual([])
})
it('does not restore or pretend to save a browser-only payment method', () => {
  storage.set(`repixl-payments-${email}`, '[{"id":"fake-card"}]')
  usePaymentStore.getState().hydrate()
  expect(usePaymentStore.getState().cards).toEqual([])
  expect(() =>
    usePaymentStore
      .getState()
      .addCard({
        last4: '1234',
        brand: 'Card',
        expiry: '12/30',
        cardholderName: 'Customer',
        isDefault: true,
      })
  ).toThrow('unavailable')
  expect(local.setItem).not.toHaveBeenCalled()
})

it('uses the server-created order number and totals without caching the order', async () => {
  fetchMock.mockResolvedValue(Response.json({ success: true, data: {
    ...input, orderNumber: 'SERVER-ORDER', createdAt: '2026-09-01', status: 'PROCESSING', subtotal: 123, total: 133, items: [],
  } }))
  const created = await useOrderHistoryStore.getState().addOrder(input)
  expect(created.orderNumber).toBe('SERVER-ORDER')
  expect(created.total).toBe(133)
  expect(useOrderHistoryStore.getState().orders).toEqual([created])
  expect(local.setItem).not.toHaveBeenCalled()
})

it('does not change order status or archive lists on failed writes', async () => {
  const order = { ...input, orderNumber: 'ORDER', date: '', subtotal: 10, total: 20, items: [], status: 'Processing' as const, barangay: '', province: '' }
  useOrderHistoryStore.setState({ orders: [order] })
  await expect(useOrderHistoryStore.getState().updateStatus('ORDER', 'Shipped')).rejects.toThrow()
  await expect(useOrderHistoryStore.getState().archiveOrder('ORDER')).rejects.toThrow()
  expect(useOrderHistoryStore.getState().orders).toEqual([order])
  expect(useOrderHistoryStore.getState().archivedOrders).toEqual([])
})

it('ignores late address results after switching accounts', async () => {
  let resolve!: (response: Response) => void
  fetchMock.mockImplementation(() => new Promise<Response>((done) => { resolve = done }))
  const pending = useAddressStore.getState().hydrate()
  useAuthStore.setState({ userEmail: 'other@example.com' })
  resolve(Response.json({ success: true, data: [{ ...address, id: 'previous-account-address' }] }))
  await pending
  expect(useAddressStore.getState().addresses).toEqual([])
})

it('replaces stale in-memory cart items when the server cart is empty', async () => {
  useCartStore.setState({ items: [{ slug: 'old-camera', quantity: 1 }] })
  fetchMock.mockResolvedValue(Response.json({ success: true, data: [] }))
  await useCartStore.getState().hydrate()
  expect(useCartStore.getState().items).toEqual([])
})
