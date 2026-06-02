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

export class BadgeRuleNotFoundError extends Error {
  readonly code = 'BADGE_RULE_NOT_FOUND'
  readonly statusCode = 404

  constructor(msg = 'Product badge rule not found') {
    super(msg)
    this.name = 'BadgeRuleNotFoundError'
  }
}

export class InvalidBadgeRuleError extends Error {
  readonly code = 'INVALID_BADGE_RULE'
  readonly statusCode = 400

  constructor(msg = 'Product badge rule is invalid') {
    super(msg)
    this.name = 'InvalidBadgeRuleError'
  }
}

export class UnauthorizedBadgeRuleMutationError extends Error {
  readonly code = 'UNAUTHORIZED_BADGE_RULE_MUTATION'
  readonly statusCode = 403

  constructor(msg = 'You are not allowed to mutate product badge rules') {
    super(msg)
    this.name = 'UnauthorizedBadgeRuleMutationError'
  }
}

export class InvalidSearchQueryError extends Error {
  readonly code = 'INVALID_SEARCH_QUERY'
  readonly statusCode = 400

  constructor(msg = 'Search query is invalid') {
    super(msg)
    this.name = 'InvalidSearchQueryError'
  }
}

export class InvalidFilterError extends Error {
  readonly code = 'INVALID_FILTER'
  readonly statusCode = 400

  constructor(msg = 'One or more search filters are invalid') {
    super(msg)
    this.name = 'InvalidFilterError'
  }
}

export class SearchExecutionError extends Error {
  readonly code = 'SEARCH_EXECUTION_ERROR'
  readonly statusCode = 500

  constructor(msg = 'Search could not be executed') {
    super(msg)
    this.name = 'SearchExecutionError'
  }
}
