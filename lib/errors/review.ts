export class ReviewProductNotFoundError extends Error {
  readonly code = 'PRODUCT_NOT_FOUND' as const

  constructor(message = 'Product not found') {
    super(message)
    this.name = 'ReviewProductNotFoundError'
  }
}

export class ReviewNotFoundError extends Error {
  readonly code = 'REVIEW_NOT_FOUND' as const

  constructor(message = 'Review not found') {
    super(message)
    this.name = 'ReviewNotFoundError'
  }
}

export class ReviewAlreadyExistsError extends Error {
  readonly code = 'REVIEW_ALREADY_EXISTS' as const

  constructor(message = 'You have already submitted a review for this product') {
    super(message)
    this.name = 'ReviewAlreadyExistsError'
  }
}

export class ReviewPurchaseRequiredError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'Only buyers with a confirmed or paid order can review this product') {
    super(message)
    this.name = 'ReviewPurchaseRequiredError'
  }
}

export class ReviewSelfReviewForbiddenError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'You cannot review your own product') {
    super(message)
    this.name = 'ReviewSelfReviewForbiddenError'
  }
}

export class ReviewOwnershipError extends Error {
  readonly code = 'FORBIDDEN' as const

  constructor(message = 'You do not have access to this review') {
    super(message)
    this.name = 'ReviewOwnershipError'
  }
}

export class ReviewModerationReasonRequiredError extends Error {
  readonly code = 'REVIEW_MODERATION_REASON_REQUIRED' as const

  constructor(message = 'Moderation reason is required for this action') {
    super(message)
    this.name = 'ReviewModerationReasonRequiredError'
  }
}
