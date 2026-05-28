import type {
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
} from '@/app/generated/prisma/client'

export type OrderItemDto = {
  id: string
  productNameSnapshot: string
  variantSnapshot: string | null
  imageSnapshot: string | null
  storeNameSnapshot: string
  unitPriceSnapshot: string
  quantity: number
}

export type OrderPaymentSummaryDto = {
  paymentId: string | null
  paymentProvider: PaymentProvider | null
  paymentMethod: PaymentMethod | null
  paymentStatus: PaymentStatus | null
  paidAt: string | null
}

export type OrderSummaryDto = {
  id: string
  status: string
  totalAmount: string
  itemCount: number
  createdAt: Date
  storeNames: string[]
} & OrderPaymentSummaryDto

export type OrderDetailDto = {
  id: string
  status: string
  totalAmount: string
  shippingAddressId: string | null
  note: string | null
  createdAt: Date
  items: OrderItemDto[]
} & OrderPaymentSummaryDto

export type SellerOrderItemDto = {
  id: string
  orderId: string
  productNameSnapshot: string
  variantSnapshot: string | null
  quantity: number
  unitPriceSnapshot: string
  orderStatus: string
  orderCreatedAt: Date
}

export type OrderFilterInput = {
  status?: string
  page?: number
  limit?: number
}
