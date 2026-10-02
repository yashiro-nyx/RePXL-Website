// RePXL shared type definitions

export type ConditionGrade = 'mint' | 'excellent' | 'good' | 'fair'

export type ProductStatus = 'active' | 'inactive' | 'coming-soon' | 'discontinued'

export interface ProductSpecs {
  megapixels: number
  zoom: string
  storage: string
  year: number
}

export interface Product {
  slug: string
  name: string
  brand: string
  series: string
  price: number
  condition: ConditionGrade
  image: string
  specs: ProductSpecs
  stock: number
  description: string
  status: ProductStatus
  serialNumber?: string
  conditionNotes?: string
  /**
   * Real units sold — SUM of OrderItem.quantity across DELIVERED/COMPLETED
   * orders. Only present on the single-product detail fetch
   * (`GET /api/products/[slug]`); list endpoints omit it (leaving it undefined).
   * Never fabricated: a product that has never sold reports 0.
   */
  soldCount?: number
}

export interface CartItem {
  slug: string
  quantity: number
}
