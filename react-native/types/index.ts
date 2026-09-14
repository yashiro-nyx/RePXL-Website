export type Condition = 'MINT' | 'EXCELLENT' | 'GOOD' | 'FAIR';

export interface Specs {
  megapixels: string;
  sensor: string;
  opticalZoom: string;
  lcd: string;
  isoRange: string;
  shutterSpeed: string;
  storage: string;
  battery: string;
  weight: string;
  year: string;
}

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  body: string;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  brand: string;
  series: string;
  price: number;
  condition: Condition;
  rating: number;
  reviews: number;
  inStock: boolean;
  stockCount: number;
  image: string;
  description: string;
  conditionDetails: string;
  colorProfile: { title: string; description: string };
  specs: Specs;
  reviewList: ProductReview[];
}

export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
}

export interface Address {
  id: string;
  fullName: string;
  address: string;
  barangay: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

export type CanonicalOrderStatus =
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export type OrderStatus =
  | CanonicalOrderStatus
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Completed'
  | 'Cancelled';

export const CANONICAL_ORDER_STATUSES: readonly CanonicalOrderStatus[] = [
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
] as const;

export function normalizeOrderStatus(status: unknown): CanonicalOrderStatus {
  if (typeof status !== 'string') return 'PROCESSING';
  const upper = status.trim().toUpperCase();
  if (upper === 'SHIPPED') return 'SHIPPED';
  if (upper === 'DELIVERED') return 'DELIVERED';
  if (upper === 'COMPLETED') return 'COMPLETED';
  if (upper === 'CANCELLED' || upper === 'CANCELED') return 'CANCELLED';
  return 'PROCESSING';
}

export function getOrderStatusLabel(status: unknown, paymentStatus?: unknown): string {
  const norm = normalizeOrderStatus(status);
  if (norm === 'PROCESSING' && typeof paymentStatus === 'string') {
    const pUpper = paymentStatus.trim().toUpperCase();
    if (pUpper === 'PAID') return 'Payment Processed';
    if (pUpper === 'PENDING') return 'Order Placed';
  }
  switch (norm) {
    case 'PROCESSING':
      return 'Processing';
    case 'SHIPPED':
      return 'Shipped';
    case 'DELIVERED':
      return 'Delivered';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
  }
}

export function getOrderStatusColors(
  status: unknown,
  paymentStatus?: unknown
): { bg: string; text: string; border: string } {
  const norm = normalizeOrderStatus(status);
  if (norm === 'PROCESSING' && typeof paymentStatus === 'string') {
    const pUpper = paymentStatus.trim().toUpperCase();
    if (pUpper === 'PAID') {
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    }
  }
  switch (norm) {
    case 'PROCESSING':
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    case 'SHIPPED':
      return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
    case 'DELIVERED':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
    case 'COMPLETED':
      return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
    case 'CANCELLED':
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
  }
}

export function getPaymentStatusColors(status: unknown): { bg: string; text: string; border: string } {
  const upper = typeof status === 'string' ? status.trim().toUpperCase() : 'PENDING';
  switch (upper) {
    case 'PAID':
      return { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', border: 'rgba(34, 197, 94, 0.3)' };
    case 'FAILED':
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    case 'REFUNDED':
      return { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' };
    default:
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
  }
}

const PICKED_UP_OR_SHIPPED_KEYWORDS = [
  'picked up',
  'pickup',
  'in transit',
  'out for delivery',
  'delivered',
  'departed',
  'en route',
  'shipped',
  'dispatched',
];

export function isOrderPickedUpOrShipped(order?: {
  status?: string | null;
  deliveryStatus?: string | null;
} | null): boolean {
  if (!order) return false;

  const normStatus = normalizeOrderStatus(order.status);
  if (
    normStatus === 'SHIPPED' ||
    normStatus === 'DELIVERED' ||
    normStatus === 'COMPLETED'
  ) {
    return true;
  }

  if (order.deliveryStatus) {
    const lowerDelivery = order.deliveryStatus.toLowerCase();
    return PICKED_UP_OR_SHIPPED_KEYWORDS.some((kw) => lowerDelivery.includes(kw));
  }

  return false;
}

export function canCustomerCancelOrder(order?: {
  status?: string | null;
  deliveryStatus?: string | null;
  paymentStatus?: string | null;
  createdAt?: string | Date | null;
} | null): { allowed: boolean; reason?: string } {
  if (!order) {
    return { allowed: false, reason: 'Invalid order.' };
  }

  const normStatus = normalizeOrderStatus(order.status);

  if (normStatus === 'CANCELLED') {
    return { allowed: false, reason: 'This order has already been cancelled.' };
  }

  if (normStatus === 'COMPLETED') {
    return { allowed: false, reason: 'This order has already been completed.' };
  }

  if (isOrderPickedUpOrShipped(order)) {
    return {
      allowed: false,
      reason: 'Order cannot be cancelled because it has already been picked up by the courier or shipped.',
    };
  }

  if (normStatus !== 'PROCESSING') {
    return {
      allowed: false,
      reason: `Order cannot be cancelled at this stage (current status: ${order.status ?? 'unknown'}). Only orders in Processing status can be cancelled.`,
    };
  }

  return { allowed: true };
}

export function getPaymentTimeRemaining(
  createdAt: string | Date,
  expiryMs: number = 24 * 60 * 60 * 1000,
  now: number = Date.now()
): {
  expired: boolean;
  remainingMs: number;
  hours: number;
  minutes: number;
  text: string;
} {
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) {
    return { expired: false, remainingMs: 0, hours: 0, minutes: 0, text: '' };
  }

  const expiryTime = createdTime + expiryMs;
  const remainingMs = Math.max(0, expiryTime - now);

  if (remainingMs <= 0) {
    return {
      expired: true,
      remainingMs: 0,
      hours: 0,
      minutes: 0,
      text: 'Expired',
    };
  }

  const totalMinutes = Math.floor(remainingMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const text = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return {
    expired: false,
    remainingMs,
    hours,
    minutes,
    text,
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: string;
  total: number;
  subtotal?: number;
  shippingCost?: number;
  discount?: number;
  courierName?: string;
  courierEstimate?: string;
  paymentMethod?: string;
  voucherCode?: string | null;
  fullName?: string;
  address?: string;
  barangay?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  deliveryStatus: string;
  trackingProgress: number;
  trackingDescription: string;
  createdAt: string;
  items: Array<{ id: string; quantity: number; price: number; product: Product }>;
}

export interface Notification {
  id: string;
  event: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface AccountReview {
  id: string;
  productId: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  product?: { slug: string; name: string; image?: string };
}

export interface Profile extends User {
  username: string | null;
  gender: string | null;
  avatarUrl: string | null;
  maskedPhone: string;
  maskedDob: string;
  hasPassword: boolean;
}
