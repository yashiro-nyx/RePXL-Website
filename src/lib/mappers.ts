// ─── API ↔ Client shape/enum mappers ────────────────────────────────────────────
// The Postgres/Prisma API uses UPPERCASE enums + flat spec columns + cuid `id`s.
// The client UI uses lowercase (hyphenated) enums + nested `specs` + `slug` keys.
// These mappers keep both worlds in sync so stores can talk to the API while the
// existing components keep their current client-side types untouched.

import type { Product, ConditionGrade, ProductStatus } from '@/types'
import type { Review } from '@/stores/reviewStore'
import type { Order as ClientOrder } from '@/stores/orderHistoryStore'
import type { Voucher as ClientVoucher } from '@/stores/voucherStore'

// ─── Product ────────────────────────────────────────────────────────────────────

export interface ApiProduct {
  id: string
  slug: string
  name: string
  brand: string
  series: string
  price: number
  condition: 'MINT' | 'EXCELLENT' | 'GOOD' | 'FAIR'
  image: string
  stock: number
  description: string
  status: 'ACTIVE' | 'INACTIVE' | 'COMING_SOON' | 'DISCONTINUED'
  serialNumber: string | null
  conditionNotes: string | null
  megapixels: number
  zoom: string
  storage: string
  year: number
  createdAt?: string
  updatedAt?: string
}

const CONDITION_TO_CLIENT: Record<ApiProduct['condition'], ConditionGrade> = {
  MINT: 'mint',
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
}

const CONDITION_TO_API: Record<ConditionGrade, ApiProduct['condition']> = {
  mint: 'MINT',
  excellent: 'EXCELLENT',
  good: 'GOOD',
  fair: 'FAIR',
}

const STATUS_TO_CLIENT: Record<ApiProduct['status'], ProductStatus> = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  COMING_SOON: 'coming-soon',
  DISCONTINUED: 'discontinued',
}

const STATUS_TO_API: Record<ProductStatus, ApiProduct['status']> = {
  active: 'ACTIVE',
  inactive: 'INACTIVE',
  'coming-soon': 'COMING_SOON',
  discontinued: 'DISCONTINUED',
}

export function apiToClientProduct(p: ApiProduct): Product {
  return {
    slug: p.slug,
    name: p.name,
    brand: p.brand,
    series: p.series,
    price: p.price,
    condition: CONDITION_TO_CLIENT[p.condition] ?? 'good',
    image: p.image,
    specs: {
      megapixels: p.megapixels,
      zoom: p.zoom,
      storage: p.storage,
      year: p.year,
    },
    stock: p.stock,
    description: p.description,
    status: STATUS_TO_CLIENT[p.status] ?? 'active',
    serialNumber: p.serialNumber ?? undefined,
    conditionNotes: p.conditionNotes ?? undefined,
  }
}

/**
 * Convert a client Product (full or partial) into the API request body shape.
 * Only defined fields are emitted so it works for both create and partial update.
 */
export function clientToApiProduct(p: Partial<Product>): Record<string, unknown> {
  const body: Record<string, unknown> = {}
  if (p.slug !== undefined) body.slug = p.slug
  if (p.name !== undefined) body.name = p.name
  if (p.brand !== undefined) body.brand = p.brand
  if (p.series !== undefined) body.series = p.series
  if (p.price !== undefined) body.price = p.price
  if (p.condition !== undefined) body.condition = CONDITION_TO_API[p.condition]
  if (p.image !== undefined) body.image = p.image
  if (p.stock !== undefined) body.stock = p.stock
  if (p.description !== undefined) body.description = p.description
  if (p.status !== undefined) body.status = STATUS_TO_API[p.status]
  if (p.serialNumber !== undefined) body.serialNumber = p.serialNumber || null
  if (p.conditionNotes !== undefined) body.conditionNotes = p.conditionNotes || null
  if (p.specs) {
    if (p.specs.megapixels !== undefined) body.megapixels = p.specs.megapixels
    if (p.specs.zoom !== undefined) body.zoom = p.specs.zoom
    if (p.specs.storage !== undefined) body.storage = p.specs.storage
    if (p.specs.year !== undefined) body.year = p.specs.year
  }
  return body
}

// ─── Review ─────────────────────────────────────────────────────────────────────

export interface ApiReview {
  id: string
  productId: string
  userId: string
  reviewerName: string
  rating: number
  comment: string
  verifiedPurchase: boolean
  createdAt: string
  product?: { slug: string; name?: string; image?: string }
  user?: { firstName: string; lastName: string }
}

export function apiToClientReview(r: ApiReview, fallbackSlug = ''): Review {
  return {
    id: r.id,
    productSlug: r.product?.slug ?? fallbackSlug,
    reviewerName: r.reviewerName,
    reviewerEmail: '', // not exposed by the API for privacy; not needed for display
    rating: r.rating,
    comment: r.comment,
    date: r.createdAt,
    verifiedPurchase: r.verifiedPurchase,
  }
}

// ─── Voucher ────────────────────────────────────────────────────────────────────

export interface ApiVoucher {
  id: string
  code: string
  discountType: 'PERCENTAGE' | 'FIXED'
  discountValue: number
  minPurchase: number
  maxDiscount: number
  usageLimit: number
  perUserLimit: number
  used: number
  validFrom: string
  validUntil: string
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED'
  description: string
}

export function apiToClientVoucher(v: ApiVoucher): ClientVoucher {
  return {
    id: v.id,
    code: v.code,
    discountType: v.discountType === 'PERCENTAGE' ? 'percentage' : 'fixed',
    discountValue: v.discountValue,
    minPurchase: v.minPurchase,
    maxDiscount: v.maxDiscount,
    usageLimit: v.usageLimit,
    perUserLimit: v.perUserLimit,
    used: v.used,
    validFrom: v.validFrom?.slice(0, 10) ?? '',
    validUntil: v.validUntil?.slice(0, 10) ?? '',
    status:
      v.status === 'ACTIVE' ? 'active' : v.status === 'EXPIRED' ? 'expired' : 'disabled',
    description: v.description,
  }
}

export function clientToApiVoucher(
  v: Omit<ClientVoucher, 'id' | 'used'>
): Record<string, unknown> {
  return {
    code: v.code,
    discountType: v.discountType === 'percentage' ? 'PERCENTAGE' : 'FIXED',
    discountValue: v.discountValue,
    minPurchase: v.minPurchase,
    maxDiscount: v.maxDiscount,
    usageLimit: v.usageLimit,
    perUserLimit: v.perUserLimit,
    validFrom: v.validFrom,
    validUntil: v.validUntil,
    description: v.description,
  }
}

// ─── Order ──────────────────────────────────────────────────────────────────────

export interface ApiOrderItem {
  id: string
  productId: string
  quantity: number
  price: number
  product?: ApiProduct
}

export interface ApiOrder {
  id: string
  orderNumber: string
  userId: string
  status: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED'
  subtotal: number
  shippingCost: number
  discount: number
  total: number
  courierName: string
  courierEstimate: string
  paymentMethod: string
  voucherCode: string | null
  fullName: string
  address: string
  barangay?: string
  city: string
  province?: string
  postalCode: string
  isArchived: boolean
  createdAt: string
  items: ApiOrderItem[]
  user?: { email: string }
}

const ORDER_STATUS_TO_CLIENT: Record<ApiOrder['status'], ClientOrder['status']> = {
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const ORDER_STATUS_TO_API: Record<ClientOrder['status'], ApiOrder['status']> = {
  Processing: 'PROCESSING',
  Shipped: 'SHIPPED',
  Delivered: 'DELIVERED',
  Completed: 'COMPLETED',
  Cancelled: 'CANCELLED',
}

export function apiToClientOrder(o: ApiOrder): ClientOrder {
  // The client Order stores full Product snapshots as `items`; reconstruct them
  // from the API order items (each carries its product + the purchased price).
  const items: Product[] = o.items.map((it) => {
    const base: Product = it.product
      ? apiToClientProduct(it.product)
      : {
          slug: it.productId,
          name: 'Product',
          brand: '',
          series: '',
          price: it.price,
          condition: 'good',
          image: '',
          specs: { megapixels: 0, zoom: '', storage: '', year: 0 },
          stock: 0,
          description: '',
          status: 'active',
        }
    // Use the purchased price and reflect the ordered quantity via stock field,
    // which the order UI reads as the line quantity.
    return { ...base, price: it.price, stock: it.quantity }
  })

  return {
    orderNumber: o.orderNumber,
    date: o.createdAt,
    items,
    subtotal: o.subtotal,
    shippingCost: o.shippingCost,
    total: o.total,
    courierName: o.courierName,
    courierEstimate: o.courierEstimate,
    paymentMethod: o.paymentMethod,
    fullName: o.fullName,
    address: o.address,
    barangay: o.barangay ?? '',
    city: o.city,
    province: o.province ?? '',
    postalCode: o.postalCode,
    status: ORDER_STATUS_TO_CLIENT[o.status] ?? 'Processing',
    userEmail: o.user?.email,
  }
}
