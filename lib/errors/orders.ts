export class OrderNotFoundError extends Error {
  readonly code = 'ORDER_NOT_FOUND'
  readonly statusCode = 404
  constructor(message = 'Order not found') {
    super(message)
    this.name = 'OrderNotFoundError'
  }
}

export class OrderAccessError extends Error {
  readonly code = 'FORBIDDEN'
  readonly statusCode = 403
  constructor(message = 'Access to this order is not allowed') {
    super(message)
    this.name = 'OrderAccessError'
  }
}

export class InvalidStatusTransitionError extends Error {
  readonly code = 'INVALID_TRANSITION'
  readonly statusCode = 400
  constructor(from: string, to: string) {
    super(`Cannot transition order from "${from}" to "${to}"`)
    this.name = 'InvalidStatusTransitionError'
  }
}
