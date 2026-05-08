export type SellerOrderItemDto = {
  id: string
  orderId: string
  productNameSnapshot: string
  variantSnapshot: string | null
  quantity: number
  unitPriceSnapshot: string
  fulfillmentStatus: string
  orderStatus: string
  orderCreatedAt: Date
  shippingAddress: {
    fullName: string
    city: string
    country: string
    street: string
    building: string
    apartment: string | null
    zipCode: string | null
  } | null
}

export type SellerOrderSummaryDto = {
  orderId: string
  orderCreatedAt: Date
  orderStatus: string
  itemCount: number
  items: SellerOrderItemDto[]
}
