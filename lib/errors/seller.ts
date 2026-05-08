export class StoreNotFoundError extends Error {
  readonly code = 'STORE_NOT_FOUND'
  readonly statusCode = 404
  constructor(msg = 'Store not found') {
    super(msg)
    this.name = 'StoreNotFoundError'
  }
}

export class StoreOwnershipError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(msg = 'You do not own this store') {
    super(msg)
    this.name = 'StoreOwnershipError'
  }
}

export class ProductOwnershipError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(msg = 'Product does not belong to your store') {
    super(msg)
    this.name = 'ProductOwnershipError'
  }
}

export class UnverifiedSellerError extends Error {
  readonly code = 'UNVERIFIED_SELLER'
  readonly statusCode = 403
  constructor(msg = 'Seller account is not verified') {
    super(msg)
    this.name = 'UnverifiedSellerError'
  }
}

export class InvalidModerationTransitionError extends Error {
  readonly code = 'INVALID_MODERATION_TRANSITION'
  readonly statusCode = 400
  constructor(from: string, to: string) {
    super(`Cannot transition product from "${from}" to "${to}"`)
    this.name = 'InvalidModerationTransitionError'
  }
}

export class InvalidFulfillmentTransitionError extends Error {
  readonly code = 'INVALID_FULFILLMENT_TRANSITION'
  readonly statusCode = 400
  constructor(from: string, to: string) {
    super(`Cannot transition item from "${from}" to "${to}"`)
    this.name = 'InvalidFulfillmentTransitionError'
  }
}

export class InvalidInventoryError extends Error {
  readonly code = 'INVALID_INVENTORY'
  readonly statusCode = 400
  constructor(msg = 'Stock cannot be negative') {
    super(msg)
    this.name = 'InvalidInventoryError'
  }
}

export class AlreadyVerifiedError extends Error {
  readonly code = 'ALREADY_VERIFIED'
  readonly statusCode = 409
  constructor(msg = 'Seller is already verified') {
    super(msg)
    this.name = 'AlreadyVerifiedError'
  }
}

export class SlugConflictError extends Error {
  readonly code = 'SLUG_CONFLICT'
  readonly statusCode = 409
  constructor(msg = 'Store slug is already taken') {
    super(msg)
    this.name = 'SlugConflictError'
  }
}

export class ProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND'
  readonly statusCode = 404
  constructor(msg = 'Product not found') {
    super(msg)
    this.name = 'ProductNotFoundError'
  }
}

export class OrderItemNotFoundError extends Error {
  readonly code = 'ORDER_ITEM_NOT_FOUND'
  readonly statusCode = 404
  constructor(msg = 'Order item not found') {
    super(msg)
    this.name = 'OrderItemNotFoundError'
  }
}
