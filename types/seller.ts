export const SELLER_VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] as const
export const SELLER_ONBOARDING_STATES = [
  'BUYER',
  'PENDING_VERIFICATION',
  'VERIFIED_NO_STORE',
  'STORE_READY',
  'REJECTED',
  'SUSPENDED',
] as const
export const SELLER_PRODUCT_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'ARCHIVED'] as const
export const SELLER_FULFILLMENT_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const
export const MARKETPLACE_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const

export type SellerVerificationStatus = (typeof SELLER_VERIFICATION_STATUSES)[number]
export type SellerOnboardingState = (typeof SELLER_ONBOARDING_STATES)[number]
export type SellerProductStatus = (typeof SELLER_PRODUCT_STATUSES)[number]
export type SellerFulfillmentStatus = (typeof SELLER_FULFILLMENT_STATUSES)[number]
export type MarketplaceOrderStatus = (typeof MARKETPLACE_ORDER_STATUSES)[number]

export function getSellerOnboardingState(
  status: SellerVerificationStatus | null | undefined,
  hasStore = false,
): SellerOnboardingState {
  if (!status) {
    return 'BUYER'
  }

  if (status === 'PENDING') {
    return 'PENDING_VERIFICATION'
  }

  if (status === 'VERIFIED') {
    return hasStore ? 'STORE_READY' : 'VERIFIED_NO_STORE'
  }

  return status
}

export function isSellerOperational(status: SellerVerificationStatus | null | undefined) {
  return status === 'VERIFIED'
}

export function isSellerVerificationBlocked(status: SellerVerificationStatus | null | undefined) {
  return status === 'REJECTED' || status === 'SUSPENDED'
}

export function canSubmitProductForReview(status: SellerProductStatus) {
  return status === 'DRAFT'
}

export function canArchiveProduct(status: SellerProductStatus) {
  return status === 'PUBLISHED' || status === 'REJECTED'
}

export function canProcessFulfillment(
  fulfillmentStatus: SellerFulfillmentStatus,
  orderStatus: MarketplaceOrderStatus | string,
) {
  return fulfillmentStatus === 'PENDING' && orderStatus === 'confirmed'
}

export function canShipFulfillment(status: SellerFulfillmentStatus) {
  return status === 'PROCESSING'
}

export function canDeliverFulfillment(status: SellerFulfillmentStatus) {
  return status === 'SHIPPED'
}
