export class EmptyCartError extends Error {
  readonly code = 'EMPTY_CART'
  readonly statusCode = 400
  constructor(message = 'Cart is empty') {
    super(message)
    this.name = 'EmptyCartError'
  }
}

export class CartOwnershipError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(message = 'Cart does not belong to this user') {
    super(message)
    this.name = 'CartOwnershipError'
  }
}

export class InactiveProductError extends Error {
  readonly code = 'INACTIVE_PRODUCT'
  readonly statusCode = 400
  constructor(message = 'Product is not available') {
    super(message)
    this.name = 'InactiveProductError'
  }
}

export class InactiveStoreError extends Error {
  readonly code = 'INACTIVE_STORE'
  readonly statusCode = 400
  constructor(message = 'Store is not active') {
    super(message)
    this.name = 'InactiveStoreError'
  }
}

export class CheckoutVariantNotFoundError extends Error {
  readonly code = 'VARIANT_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Product variant not found') {
    super(message)
    this.name = 'CheckoutVariantNotFoundError'
  }
}

export class CheckoutInsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK'
  readonly statusCode = 400
  constructor(variantId: string, available: number, requested: number) {
    super(`Variant "${variantId}": only ${available} in stock, requested ${requested}`)
    this.name = 'CheckoutInsufficientStockError'
  }
}

export class InvalidShippingAddressError extends Error {
  readonly code = 'INVALID_ADDRESS'
  readonly statusCode = 400
  constructor(message = 'Shipping address not found or does not belong to user') {
    super(message)
    this.name = 'InvalidShippingAddressError'
  }
}
