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

export class CheckoutAddressRequiredError extends Error {
  readonly code = 'CHECKOUT_ADDRESS_REQUIRED'
  readonly statusCode = 400
  constructor(message = 'Shipping address is required to complete checkout') {
    super(message)
    this.name = 'CheckoutAddressRequiredError'
  }
}

export class CheckoutStockUnavailableError extends Error {
  readonly code = 'CHECKOUT_STOCK_UNAVAILABLE'
  readonly statusCode = 409
  constructor(variantId: string, available: number, requested: number) {
    super(`Variant "${variantId}" has only ${available} unit(s) available for checkout, requested ${requested}`)
    this.name = 'CheckoutStockUnavailableError'
  }
}

export class CheckoutPriceChangedError extends Error {
  readonly code = 'CHECKOUT_PRICE_CHANGED'
  readonly statusCode = 409
  constructor(expected: string, current: string) {
    super(`Checkout totals changed from ${expected} to ${current}. Please review your cart and try again.`)
    this.name = 'CheckoutPriceChangedError'
  }
}

export class CheckoutProductUnavailableError extends Error {
  readonly code = 'CHECKOUT_PRODUCT_UNAVAILABLE'
  readonly statusCode = 409
  constructor(message = 'One or more products in the cart are no longer available for checkout') {
    super(message)
    this.name = 'CheckoutProductUnavailableError'
  }
}
