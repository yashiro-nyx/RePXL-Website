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

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
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
