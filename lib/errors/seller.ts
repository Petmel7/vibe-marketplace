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

export class InvalidStoreContextError extends Error {
  readonly code = 'INVALID_STORE_CONTEXT'
  readonly statusCode = 400
  constructor(
    msg = 'Store context is required because your seller account has access to multiple stores',
  ) {
    super(msg)
    this.name = 'InvalidStoreContextError'
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

export class StoreAlreadyExistsError extends Error {
  readonly code = 'STORE_ALREADY_EXISTS'
  readonly statusCode = 409
  constructor(msg = 'A store already exists for this seller') {
    super(msg)
    this.name = 'StoreAlreadyExistsError'
  }
}

export class SellerNotVerifiedError extends Error {
  readonly code = 'SELLER_NOT_VERIFIED'
  readonly statusCode = 403
  constructor(msg = 'Seller account must be verified before provisioning a store') {
    super(msg)
    this.name = 'SellerNotVerifiedError'
  }
}

export class StoreProvisioningRequiredError extends Error {
  readonly code = 'STORE_PROVISIONING_REQUIRED'
  readonly statusCode = 403
  constructor(msg = 'Store has not been provisioned yet') {
    super(msg)
    this.name = 'StoreProvisioningRequiredError'
  }
}

export class InvalidStoreSlugError extends Error {
  readonly code = 'INVALID_STORE_SLUG'
  readonly statusCode = 400
  constructor(msg = 'Store slug is already taken or invalid') {
    super(msg)
    this.name = 'InvalidStoreSlugError'
  }
}

export class UploadFailedError extends Error {
  readonly code = 'UPLOAD_FAILED'
  readonly statusCode = 500
  constructor(msg = 'Image upload failed') {
    super(msg)
    this.name = 'UploadFailedError'
  }
}

export class InvalidImageFileError extends Error {
  readonly code = 'INVALID_IMAGE_FILE'
  readonly statusCode = 400
  constructor(msg = 'Image file is invalid or unsupported') {
    super(msg)
    this.name = 'InvalidImageFileError'
  }
}

export class StoragePathConflictError extends Error {
  readonly code = 'STORAGE_PATH_CONFLICT'
  readonly statusCode = 409
  constructor(msg = 'A storage asset already exists at this path') {
    super(msg)
    this.name = 'StoragePathConflictError'
  }
}

export class SlugAlreadyTakenError extends Error {
  readonly code = 'SLUG_ALREADY_TAKEN'
  readonly statusCode = 409
  constructor(msg = 'Store slug is already taken') {
    super(msg)
    this.name = 'SlugAlreadyTakenError'
  }
}

export class InvalidSkuError extends Error {
  readonly code = 'INVALID_SKU'
  readonly statusCode = 400
  constructor(msg = 'SKU is invalid or unavailable') {
    super(msg)
    this.name = 'InvalidSkuError'
  }
}

export class InvalidVariantConfigurationError extends Error {
  readonly code = 'INVALID_VARIANT_CONFIGURATION'
  readonly statusCode = 400
  constructor(msg = 'Variant configuration is invalid') {
    super(msg)
    this.name = 'InvalidVariantConfigurationError'
  }
}

export class CategoryNotFoundError extends Error {
  readonly code = 'CATEGORY_NOT_FOUND'
  readonly statusCode = 404
  constructor(msg = 'Category not found') {
    super(msg)
    this.name = 'CategoryNotFoundError'
  }
}

export class ProductImageLimitExceededError extends Error {
  readonly code = 'PRODUCT_IMAGE_LIMIT_EXCEEDED'
  readonly statusCode = 400
  constructor(msg = 'Product image limit exceeded') {
    super(msg)
    this.name = 'ProductImageLimitExceededError'
  }
}
