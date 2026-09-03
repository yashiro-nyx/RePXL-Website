import { z } from 'zod'

// ─── Auth Validations ───────────────────────────────────────────────────────────

export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
})

export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().max(20).optional(),
})

// ─── Product Validations ────────────────────────────────────────────────────────

export const productSchema = z.object({
  slug: z.string().min(1).max(200),
  name: z.string().min(1, 'Product name is required').max(200),
  brand: z.string().min(1, 'Brand is required').max(100),
  series: z.string().min(1, 'Series is required').max(100),
  price: z.number().positive('Price must be positive'),
  condition: z.enum(['MINT', 'EXCELLENT', 'GOOD', 'FAIR']),
  image: z.string().min(1),
  stock: z.number().int().min(0),
  description: z.string().min(1, 'Description is required'),
  status: z.enum(['ACTIVE', 'INACTIVE', 'COMING_SOON', 'DISCONTINUED']).optional(),
  serialNumber: z.string().optional().nullable(),
  conditionNotes: z.string().optional().nullable(),
  megapixels: z.number().positive(),
  zoom: z.string().min(1),
  storage: z.string().min(1),
  year: z.number().int().min(1990).max(2030),
})

export const productUpdateSchema = productSchema.partial()

// ─── Cart Validations ───────────────────────────────────────────────────────────

export const addToCartSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1).max(99).optional().default(1),
})

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1).max(99),
})

// ─── Order Validations ──────────────────────────────────────────────────────────

export const createOrderSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  address: z.string().min(1, 'Address is required'),
  barangay: z.string().optional().default(''),
  city: z.string().min(1, 'City is required'),
  province: z.string().optional().default(''),
  postalCode: z.string().min(1, 'Postal code is required'),
  courierName: z.string().min(1, 'Courier is required'),
  courierEstimate: z.string().min(1),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  voucherCode: z.string().optional().nullable(),
  shippingCost: z.number().min(0),
  // Selected product IDs: client sends the subset the customer chose on the
  // cart page. Server validates ownership (userId) and ignores any IDs that
  // don't belong to the user's cart. If omitted, falls back to the full cart
  // (backward-compatible for the fallback direct-order flow).
  selectedProductIds: z.array(z.string().min(1)).min(1, 'Select at least one item').optional(),
})

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED']),
})

// ─── Review Validations ─────────────────────────────────────────────────────────

export const createReviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1, 'Review comment is required').max(2000),
})

export const updateReviewSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().min(1).max(2000).optional(),
})

// ─── Address Validations ────────────────────────────────────────────────────────

export const addressSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(100),
  address: z.string().min(1, 'Address is required').max(300),
  barangay: z.string().max(100).optional().default(''),
  city: z.string().min(1, 'City is required').max(100),
  province: z.string().max(100).optional().default(''),
  postalCode: z.string().min(1, 'Postal code is required').max(20),
  phone: z.string().min(1, 'Phone is required').max(20),
  isDefault: z.boolean().optional().default(false),
  // PSGC codes for cascading dropdown re-population
  regionCode: z.string().max(20).optional().default(''),
  provinceCode: z.string().max(20).optional().default(''),
  cityCode: z.string().max(20).optional().default(''),
})

// ─── Voucher Validations ────────────────────────────────────────────────────────

export const voucherSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive('Discount value must be positive'),
  minPurchase: z.number().min(0).optional().default(0),
  maxDiscount: z.number().min(0).optional().default(0),
  usageLimit: z.number().int().min(0).optional().default(0),
  perUserLimit: z.number().int().min(1).optional().default(1),
  validFrom: z.string().min(1),
  validUntil: z.string().min(1),
  description: z.string().optional().default(''),
})

export const validateVoucherSchema = z.object({
  code: z.string().min(1, 'Voucher code is required'),
  cartTotal: z.number().positive('Cart total must be positive'),
})
