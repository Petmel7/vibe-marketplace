export class SellerBalanceNotFoundError extends Error {
  code = 'SELLER_BALANCE_NOT_FOUND'

  constructor(message = 'Seller balance not found') {
    super(message)
    this.name = 'SellerBalanceNotFoundError'
  }
}

export class InsufficientAvailableBalanceError extends Error {
  code = 'INSUFFICIENT_AVAILABLE_BALANCE'

  constructor(message = 'Insufficient available seller balance for payout') {
    super(message)
    this.name = 'InsufficientAvailableBalanceError'
  }
}

export class PayoutNotFoundError extends Error {
  code = 'PAYOUT_NOT_FOUND'

  constructor(message = 'Payout not found') {
    super(message)
    this.name = 'PayoutNotFoundError'
  }
}

export class InvalidPayoutTransitionError extends Error {
  code = 'INVALID_PAYOUT_TRANSITION'

  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition payout from ${fromStatus} to ${toStatus}`)
    this.name = 'InvalidPayoutTransitionError'
  }
}

export class DuplicateLedgerEntryError extends Error {
  code = 'DUPLICATE_LEDGER_ENTRY'

  constructor(message = 'Seller finance entries for this order item already exist') {
    super(message)
    this.name = 'DuplicateLedgerEntryError'
  }
}

export class CommissionCalculationError extends Error {
  code = 'COMMISSION_CALCULATION_ERROR'

  constructor(message = 'Seller commission could not be calculated') {
    super(message)
    this.name = 'CommissionCalculationError'
  }
}

export class PayoutOwnershipError extends Error {
  code = 'FORBIDDEN'

  constructor(message = 'Access to this payout or seller finance resource is not allowed') {
    super(message)
    this.name = 'PayoutOwnershipError'
  }
}
