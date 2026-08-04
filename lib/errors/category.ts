import { ConflictError, ValidationError } from './app'

export class CategorySlugConflictError extends ConflictError {
  constructor(msg = 'Category slug is already taken') {
    super(msg, 'CATEGORY_SLUG_CONFLICT')
    this.name = 'CategorySlugConflictError'
  }
}

export class CategoryCircularReferenceError extends ValidationError {
  constructor(msg = 'Category cannot be moved inside itself or one of its descendants') {
    super(msg, 'CATEGORY_CIRCULAR_REFERENCE')
    this.name = 'CategoryCircularReferenceError'
  }
}

export class CategoryHasProductsError extends ConflictError {
  constructor(msg = 'Category with linked products cannot be hard deleted') {
    super(msg, 'CATEGORY_HAS_PRODUCTS')
    this.name = 'CategoryHasProductsError'
  }
}
