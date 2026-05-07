export type CheckoutInput = {
  cartId: string
  shippingAddressId: string
  note?: string
}

export type CheckoutResponseDto = {
  orderId: string
  totalAmount: string
  itemCount: number
  status: string
  createdAt: Date
}
