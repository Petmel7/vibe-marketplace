export class RefundRequestNotFoundError extends Error {
  code = 'REFUND_REQUEST_NOT_FOUND'

  constructor(message = 'Refund request not found') {
    super(message)
    this.name = 'RefundRequestNotFoundError'
  }
}

export class RefundRequestOwnershipError extends Error {
  code = 'REFUND_REQUEST_OWNERSHIP_ERROR'

  constructor(message = 'You do not have access to this refund request') {
    super(message)
    this.name = 'RefundRequestOwnershipError'
  }
}

export class DuplicateRefundRequestError extends Error {
  code = 'DUPLICATE_REFUND_REQUEST'

  constructor(message = 'An active refund request already exists for this order item') {
    super(message)
    this.name = 'DuplicateRefundRequestError'
  }
}

export class InvalidRefundTransitionError extends Error {
  code = 'INVALID_REFUND_TRANSITION'

  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition refund request from ${fromStatus} to ${toStatus}`)
    this.name = 'InvalidRefundTransitionError'
  }
}

export class RefundAmountExceededError extends Error {
  code = 'REFUND_AMOUNT_EXCEEDED'

  constructor(message = 'Refund amount exceeds the eligible paid amount') {
    super(message)
    this.name = 'RefundAmountExceededError'
  }
}

export class RefundPaymentNotEligibleError extends Error {
  code = 'REFUND_PAYMENT_NOT_ELIGIBLE'

  constructor(message = 'This payment is not eligible for a refund request') {
    super(message)
    this.name = 'RefundPaymentNotEligibleError'
  }
}

export class RefundOrderNotEligibleError extends Error {
  code = 'REFUND_ORDER_NOT_ELIGIBLE'

  constructor(message = 'This order is not eligible for a refund request') {
    super(message)
    this.name = 'RefundOrderNotEligibleError'
  }
}

export class RefundLedgerReversalError extends Error {
  code = 'REFUND_LEDGER_REVERSAL_ERROR'

  constructor(message = 'Unable to apply the seller ledger refund reversal') {
    super(message)
    this.name = 'RefundLedgerReversalError'
  }
}
