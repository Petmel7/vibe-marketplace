export class PaymentNotFoundError extends Error {
  code = 'PAYMENT_NOT_FOUND'

  constructor(message = 'Payment not found') {
    super(message)
    this.name = 'PaymentNotFoundError'
  }
}

export class PaymentProviderError extends Error {
  code = 'PAYMENT_PROVIDER_ERROR'

  constructor(message = 'Payment provider is unavailable right now') {
    super(message)
    this.name = 'PaymentProviderError'
  }
}

export class PaymentAmountMismatchError extends Error {
  code = 'PAYMENT_AMOUNT_MISMATCH'

  constructor(message = 'Payment amount does not match the server-calculated order total') {
    super(message)
    this.name = 'PaymentAmountMismatchError'
  }
}

export class PaymentWebhookSignatureError extends Error {
  code = 'PAYMENT_WEBHOOK_SIGNATURE_INVALID'

  constructor(message = 'Payment webhook signature could not be verified') {
    super(message)
    this.name = 'PaymentWebhookSignatureError'
  }
}

export class PaymentWebhookDuplicateError extends Error {
  code = 'PAYMENT_WEBHOOK_DUPLICATE'

  constructor(message = 'This payment webhook event was already processed') {
    super(message)
    this.name = 'PaymentWebhookDuplicateError'
  }
}

export class InvalidPaymentTransitionError extends Error {
  code = 'INVALID_PAYMENT_TRANSITION'

  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition payment from ${fromStatus} to ${toStatus}`)
    this.name = 'InvalidPaymentTransitionError'
  }
}

export class UnsupportedPaymentMethodError extends Error {
  code = 'UNSUPPORTED_PAYMENT_METHOD'

  constructor(method: string) {
    super(`Unsupported payment method: ${method}`)
    this.name = 'UnsupportedPaymentMethodError'
  }
}

export class RefundNotSupportedError extends Error {
  code = 'REFUND_NOT_SUPPORTED'

  constructor(message = 'Refunds are not supported for this payment provider or method yet') {
    super(message)
    this.name = 'RefundNotSupportedError'
  }
}
