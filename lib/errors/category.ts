export class CategorySlugConflictError extends Error {
  readonly code = 'CATEGORY_SLUG_CONFLICT'
  readonly statusCode = 409

  constructor(msg = 'Category slug is already taken') {
    super(msg)
    this.name = 'CategorySlugConflictError'
  }
}

export class CategoryCircularReferenceError extends Error {
  readonly code = 'CATEGORY_CIRCULAR_REFERENCE'
  readonly statusCode = 400

  constructor(msg = 'Category cannot be moved inside itself or one of its descendants') {
    super(msg)
    this.name = 'CategoryCircularReferenceError'
  }
}

export class CategoryHasProductsError extends Error {
  readonly code = 'CATEGORY_HAS_PRODUCTS'
  readonly statusCode = 409

  constructor(msg = 'Category with linked products cannot be hard deleted') {
    super(msg)
    this.name = 'CategoryHasProductsError'
  }
}
