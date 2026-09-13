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

export function getOrderStatusLabel(status: unknown): string {
  const norm = normalizeOrderStatus(status);
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

export function getOrderStatusColors(status: unknown): { bg: string; text: string; border: string } {
  const norm = normalizeOrderStatus(status);
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
