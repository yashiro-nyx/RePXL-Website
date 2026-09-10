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

export interface Review {
  author: string;
  rating: number;
  date: string;
  body: string;
}

export interface Product {
  id: number;
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
  reviewList: Review[];
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface User {
  name: string;
  email: string;
  joined: string;
}
