export class CommissionRuleNotFoundError extends Error {
  code = 'COMMISSION_RULE_NOT_FOUND'

  constructor(message = 'Commission rule not found') {
    super(message)
    this.name = 'CommissionRuleNotFoundError'
  }
}

export class InvalidCommissionRuleError extends Error {
  code = 'INVALID_COMMISSION_RULE'

  constructor(message = 'Commission rule is invalid') {
    super(message)
    this.name = 'InvalidCommissionRuleError'
  }
}

export class CommissionRuleConflictError extends Error {
  code = 'COMMISSION_RULE_CONFLICT'

  constructor(message = 'Commission rule conflicts with an existing rule') {
    super(message)
    this.name = 'CommissionRuleConflictError'
  }
}

export class CommissionCalculationError extends Error {
  code = 'COMMISSION_CALCULATION_ERROR'

  constructor(message = 'Seller commission could not be calculated') {
    super(message)
    this.name = 'CommissionCalculationError'
  }
}
