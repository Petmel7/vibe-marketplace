import type { ProductStockStatus } from '@/features/products/product.dto'
import type { AppliedPromotionDto } from '@/features/promotions/promotions.dto'
import type {
  CheckoutPaymentMethod,
  PaymentHostedCheckoutActionDto,
  PaymentNextAction,
} from '@/features/payments/payment.dto'
import type { PaymentMethod, PaymentStatus } from '@/app/generated/prisma/client'
import type {
  CheckoutDeliverySelectionDto,
} from '@/features/shipping/shipping.dto'

export type CheckoutInput = {
  cartId: string
  shippingAddressId?: string | null
  acceptedPrivacy: boolean
  deliveryType?: CheckoutDeliverySelectionDto['selectedDeliveryType']
  recipientName?: string | null
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
  recipientPhone?: string | null
  recipientCityRef?: string | null
  recipientCityName?: string | null
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
  expectedSubtotal?: string | null
  expectedTotal?: string | null
  couponCode?: string | null
  note?: string
  paymentMethod: CheckoutPaymentMethod
}

export type CheckoutPreviewInput = {
  cartId?: string
  couponCode?: string | null
  paymentMethod?: CheckoutPaymentMethod | null
  deliveryType?: CheckoutDeliverySelectionDto['selectedDeliveryType']
  recipientName?: string | null
  recipientFirstName?: string | null
  recipientLastName?: string | null
  recipientMiddleName?: string | null
  recipientPhone?: string | null
  recipientCityRef?: string | null
  recipientCityName?: string | null
  recipientStreet?: string | null
  recipientBuilding?: string | null
  recipientApartment?: string | null
  recipientWarehouseRef?: string | null
  recipientWarehouseName?: string | null
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
  discountAmount: string
  shippingAmount: string
  total: string
  appliedPromotion: AppliedPromotionDto | null
  defaultShippingAddress: CheckoutAddressOptionDto | null
  addressOptions: CheckoutAddressOptionDto[]
  deliverySelection: CheckoutDeliverySelectionDto
  blockingIssues: CheckoutBlockingIssueDto[]
  canCheckout: boolean
}

export type CheckoutResponseDto = {
  orderId: string
  paymentId: string
  paymentStatus: PaymentStatus
  paymentMethod: PaymentMethod
  checkoutUrl: string | null
  nextAction: PaymentNextAction
  paymentAction: PaymentHostedCheckoutActionDto | null
  totalAmount: string
  itemCount: number
  status: string
  createdAt: Date
}
