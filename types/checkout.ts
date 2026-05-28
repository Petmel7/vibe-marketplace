import type { ProductStockStatus } from '@/features/products/product.dto'
import type {
  CheckoutPaymentMethod,
  HostedPaymentAction,
  PaymentMethod,
  PaymentNextAction,
  PaymentStatus,
} from '@/types/payments'

export type CheckoutAddressOption = {
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

export type CheckoutPreviewItem = {
  id: string
  productId: string
  variantId: string
  storeId: string
  storeName: string
  storeSlug: string
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

export type CheckoutBlockingIssue = {
  code: CheckoutBlockingIssueCode
  message: string
  cartItemId?: string
  productId?: string
  variantId?: string
}

export type CheckoutPreview = {
  cartId: string | null
  items: CheckoutPreviewItem[]
  itemCount: number
  subtotal: string
  shippingAmount: string
  total: string
  defaultShippingAddress: CheckoutAddressOption | null
  addressOptions: CheckoutAddressOption[]
  blockingIssues: CheckoutBlockingIssue[]
  canCheckout: boolean
}

export type CheckoutSubmitPayload = {
  cartId: string
  shippingAddressId?: string | null
  expectedSubtotal?: string | null
  expectedTotal?: string | null
  paymentMethod: CheckoutPaymentMethod
}

export type CheckoutResponse = {
  orderId: string
  paymentId: string
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  checkoutUrl: string | null
  nextAction: PaymentNextAction
  paymentAction: HostedPaymentAction | null
  totalAmount: string
  itemCount: number
  status: string
  createdAt: string
}
