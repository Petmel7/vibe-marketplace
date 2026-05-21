export class InvalidBadgeTransitionError extends Error {
  readonly code = 'INVALID_BADGE_TRANSITION'
  readonly statusCode = 400

  constructor(msg = 'Badge mutation is invalid for the requested product state') {
    super(msg)
    this.name = 'InvalidBadgeTransitionError'
  }
}

export class ProductBadgeConflictError extends Error {
  readonly code = 'PRODUCT_BADGE_CONFLICT'
  readonly statusCode = 409

  constructor(msg = 'A conflicting product badge already exists') {
    super(msg)
    this.name = 'ProductBadgeConflictError'
  }
}

export class UnauthorizedBadgeMutationError extends Error {
  readonly code = 'UNAUTHORIZED_BADGE_MUTATION'
  readonly statusCode = 403

  constructor(msg = 'You are not allowed to mutate product badges') {
    super(msg)
    this.name = 'UnauthorizedBadgeMutationError'
  }
}

export class ProductMetricsCalculationError extends Error {
  readonly code = 'PRODUCT_METRICS_CALCULATION_ERROR'
  readonly statusCode = 500

  constructor(msg = 'Product metrics could not be calculated') {
    super(msg)
    this.name = 'ProductMetricsCalculationError'
  }
}
