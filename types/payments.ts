export const CHECKOUT_PAYMENT_METHODS = ['CASH_ON_DELIVERY', 'CARD'] as const

export type CheckoutPaymentMethod = (typeof CHECKOUT_PAYMENT_METHODS)[number]

export const PAYMENT_METHODS = [
  'CARD',
  'APPLE_PAY',
  'GOOGLE_PAY',
  'CASH_ON_DELIVERY',
  'MANUAL',
] as const

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
] as const

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_NEXT_ACTIONS = [
  'NONE',
  'AWAITING_CASH_ON_DELIVERY',
  'AWAITING_PROVIDER_CONFIRMATION',
  'AWAITING_MANUAL_CONFIRMATION',
] as const

export type PaymentNextAction = (typeof PAYMENT_NEXT_ACTIONS)[number]

export function isCheckoutPaymentMethod(value: string | null | undefined): value is CheckoutPaymentMethod {
  return Boolean(value && CHECKOUT_PAYMENT_METHODS.includes(value as CheckoutPaymentMethod))
}

export function isPaymentMethod(value: string | null | undefined): value is PaymentMethod {
  return Boolean(value && PAYMENT_METHODS.includes(value as PaymentMethod))
}

export function isPaymentStatus(value: string | null | undefined): value is PaymentStatus {
  return Boolean(value && PAYMENT_STATUSES.includes(value as PaymentStatus))
}

export function isPaymentNextAction(value: string | null | undefined): value is PaymentNextAction {
  return Boolean(value && PAYMENT_NEXT_ACTIONS.includes(value as PaymentNextAction))
}
