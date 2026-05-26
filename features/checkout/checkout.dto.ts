import type { ProductStockStatus } from '@/features/products/product.dto'

export type CheckoutInput = {
  cartId: string
  shippingAddressId?: string | null
  expectedSubtotal?: string | null
  expectedTotal?: string | null
  note?: string
}

export type CheckoutPreviewInput = {
  cartId?: string
}

export type CheckoutAddressOptionDto = {
  id: string
  label: string | null
  fullName: string
  phone: string
  country: string
  city: string
  region: string | null
  street: string
  building: string
  apartment: string | null
  zipCode: string | null
  isDefault: boolean
}

export type CheckoutPreviewItemDto = {
  id: string
  productId: string
  variantId: string
  productName: string
  variantLabel: string | null
  imageUrl: string | null
  quantity: number
  unitPrice: string
  lineTotal: string
  availableStock: number
  inStock: boolean
  stockStatus: ProductStockStatus
}

export type CheckoutBlockingIssueCode =
  | 'EMPTY_CART'
  | 'ADDRESS_REQUIRED'
  | 'PRODUCT_UNAVAILABLE'
  | 'STOCK_UNAVAILABLE'
  | 'PRICE_CHANGED'

export type CheckoutBlockingIssueDto = {
  code: CheckoutBlockingIssueCode
  message: string
  cartItemId?: string
  productId?: string
  variantId?: string
}

export type CheckoutPreviewResponseDto = {
  cartId: string | null
  items: CheckoutPreviewItemDto[]
  itemCount: number
  subtotal: string
  shippingAmount: string
  total: string
  defaultShippingAddress: CheckoutAddressOptionDto | null
  addressOptions: CheckoutAddressOptionDto[]
  blockingIssues: CheckoutBlockingIssueDto[]
  canCheckout: boolean
}

export type CheckoutResponseDto = {
  orderId: string
  totalAmount: string
  itemCount: number
  status: string
  createdAt: Date
}
