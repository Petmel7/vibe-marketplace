import { ConflictError, ExternalServiceError, NotFoundError, ValidationError } from './app'

export class PaymentNotFoundError extends NotFoundError {
  constructor(message = 'Payment not found') {
    super(message, 'PAYMENT_NOT_FOUND')
    this.name = 'PaymentNotFoundError'
  }
}

export class PaymentProviderError extends ExternalServiceError {
  constructor(message = 'Payment provider is unavailable right now') {
    super(message, 'PAYMENT_PROVIDER_ERROR')
    this.name = 'PaymentProviderError'
  }
}

export class LiqPayConfigError extends ExternalServiceError {
  constructor(message = 'LiqPay configuration is invalid') {
    super(message, 'LIQPAY_CONFIG_ERROR')
    this.name = 'LiqPayConfigError'
  }
}

export class LiqPaySignatureError extends ValidationError {
  constructor(message = 'LiqPay callback signature could not be verified') {
    super(message, 'LIQPAY_SIGNATURE_ERROR')
    this.name = 'LiqPaySignatureError'
  }
}

export class LiqPayPayloadError extends ValidationError {
  constructor(message = 'LiqPay payload is invalid') {
    super(message, 'LIQPAY_PAYLOAD_ERROR')
    this.name = 'LiqPayPayloadError'
  }
}

export class LiqPayAmountMismatchError extends ValidationError {
  constructor(message = 'LiqPay amount does not match the stored payment record') {
    super(message, 'LIQPAY_AMOUNT_MISMATCH')
    this.name = 'LiqPayAmountMismatchError'
  }
}

export class LiqPayStatusMappingError extends ValidationError {
  constructor(status: string) {
    super(`Unsupported LiqPay status: ${status}`, 'LIQPAY_STATUS_MAPPING_ERROR')
    this.name = 'LiqPayStatusMappingError'
  }
}

export class PaymentAmountMismatchError extends ValidationError {
  constructor(message = 'Payment amount does not match the server-calculated order total') {
    super(message, 'PAYMENT_AMOUNT_MISMATCH')
    this.name = 'PaymentAmountMismatchError'
  }
}

export class PaymentWebhookSignatureError extends ValidationError {
  constructor(message = 'Payment webhook signature could not be verified') {
    super(message, 'PAYMENT_WEBHOOK_SIGNATURE_INVALID')
    this.name = 'PaymentWebhookSignatureError'
  }
}

export class PaymentWebhookDuplicateError extends ConflictError {
  constructor(message = 'This payment webhook event was already processed') {
    super(message, 'PAYMENT_WEBHOOK_DUPLICATE')
    this.name = 'PaymentWebhookDuplicateError'
  }
}

export class InvalidPaymentTransitionError extends ValidationError {
  constructor(fromStatus: string, toStatus: string) {
    super(`Cannot transition payment from ${fromStatus} to ${toStatus}`, 'INVALID_PAYMENT_TRANSITION')
    this.name = 'InvalidPaymentTransitionError'
  }
}

export class UnsupportedPaymentMethodError extends ValidationError {
  constructor(method: string) {
    super(`Unsupported payment method: ${method}`, 'UNSUPPORTED_PAYMENT_METHOD')
    this.name = 'UnsupportedPaymentMethodError'
  }
}

export class RefundNotSupportedError extends ValidationError {
  constructor(message = 'Refunds are not supported for this payment provider or method yet') {
    super(message, 'REFUND_NOT_SUPPORTED')
    this.name = 'RefundNotSupportedError'
  }
}
