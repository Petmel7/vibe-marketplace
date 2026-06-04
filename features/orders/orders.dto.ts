import type {
  PromotionDiscountType,
  PromotionOwnerType,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus,
  ShippingDeliveryType,
  ShipmentStatus,
  ShippingProvider,
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

export type OrderPromotionSummaryDto = {
  promotionId: string
  promotionCode: string
  ownerType: PromotionOwnerType
  storeId: string | null
  promotionName: string | null
  discountType: PromotionDiscountType
  discountValue: string
  discountAmount: string
}

export type OrderShipmentSummaryDto = {
  id: string
  provider: ShippingProvider
  deliveryType: ShippingDeliveryType
  status: ShipmentStatus
  recipientCityRef: string
  recipientCityName: string
  recipientStreet: string | null
  recipientBuilding: string | null
  recipientApartment: string | null
  recipientWarehouseRef: string | null
  recipientWarehouseName: string | null
  trackingNumber: string | null
  isReturnShipment: boolean
  originalShipmentId: string | null
}

export type OrderSummaryDto = {
  id: string
  status: string
  totalAmount: string
  itemCount: number
  createdAt: Date
  storeNames: string[]
  promotion: OrderPromotionSummaryDto | null
} & OrderPaymentSummaryDto

export type OrderDetailDto = {
  id: string
  status: string
  totalAmount: string
  shippingAddressId: string | null
  note: string | null
  createdAt: Date
  items: OrderItemDto[]
  shipments: OrderShipmentSummaryDto[]
  promotion: OrderPromotionSummaryDto | null
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
