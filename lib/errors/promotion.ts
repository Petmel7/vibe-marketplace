export class PromotionNotFoundError extends Error {
  code = 'PROMOTION_NOT_FOUND'

  constructor(message = 'Promotion not found') {
    super(message)
    this.name = 'PromotionNotFoundError'
  }
}

export class PromotionInactiveError extends Error {
  code = 'PROMOTION_INACTIVE'

  constructor(message = 'Promotion is not active right now') {
    super(message)
    this.name = 'PromotionInactiveError'
  }
}

export class PromotionExpiredError extends Error {
  code = 'PROMOTION_EXPIRED'

  constructor(message = 'Promotion is outside of its active date window') {
    super(message)
    this.name = 'PromotionExpiredError'
  }
}

export class PromotionUsageLimitReachedError extends Error {
  code = 'PROMOTION_USAGE_LIMIT_REACHED'

  constructor(message = 'This promotion has reached its usage limit') {
    super(message)
    this.name = 'PromotionUsageLimitReachedError'
  }
}

export class PromotionUserLimitReachedError extends Error {
  code = 'PROMOTION_USER_LIMIT_REACHED'

  constructor(message = 'You have already used this promotion the maximum number of times') {
    super(message)
    this.name = 'PromotionUserLimitReachedError'
  }
}

export class PromotionMinimumAmountError extends Error {
  code = 'PROMOTION_MINIMUM_AMOUNT'

  constructor(message = 'Order subtotal does not meet the minimum amount for this promotion') {
    super(message)
    this.name = 'PromotionMinimumAmountError'
  }
}

export class InvalidPromotionCodeError extends Error {
  code = 'INVALID_PROMOTION_CODE'

  constructor(message = 'Promotion code is invalid') {
    super(message)
    this.name = 'InvalidPromotionCodeError'
  }
}

export class PromotionDuplicateCodeError extends Error {
  code = 'PROMOTION_DUPLICATE_CODE'

  constructor(message = 'A promotion with this code already exists') {
    super(message)
    this.name = 'PromotionDuplicateCodeError'
  }
}

export class PromotionDeleteConflictError extends Error {
  code = 'PROMOTION_DELETE_CONFLICT'

  constructor(message = 'This promotion cannot be deleted because it is already used in orders') {
    super(message)
    this.name = 'PromotionDeleteConflictError'
  }
}
