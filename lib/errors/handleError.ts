import { UnauthorizedError, ForbiddenError } from './auth'
import {
  ProfileNotFoundError,
  AddressNotFoundError,
  AddressOwnershipError,
  SellerProfileNotFoundError,
  SellerAlreadyOnboardedError,
  AdminProfileNotFoundError,
} from './profile'
import {
  EmptyCartError,
  CartOwnershipError,
  InactiveProductError,
  InactiveStoreError,
  CheckoutVariantNotFoundError,
  CheckoutInsufficientStockError,
  InvalidShippingAddressError,
  CheckoutAddressRequiredError,
  CheckoutStockUnavailableError,
  CheckoutPriceChangedError,
  CheckoutProductUnavailableError,
} from './checkout'
import {
  OrderNotFoundError,
  OrderAccessError,
  InvalidStatusTransitionError,
} from './orders'
import {
  StoreNotFoundError,
  StoreOwnershipError,
  ProductOwnershipError,
  UnverifiedSellerError,
  ProductNotFoundError,
  OrderItemNotFoundError,
  SlugConflictError,
  AlreadyVerifiedError,
  InvalidModerationTransitionError,
  InvalidFulfillmentTransitionError,
  InvalidInventoryError,
  StoreAlreadyExistsError,
  SellerNotVerifiedError,
  StoreProvisioningRequiredError,
  InvalidStoreSlugError,
  UploadFailedError,
  InvalidImageFileError,
  StoragePathConflictError,
  SlugAlreadyTakenError,
  InvalidSkuError,
  CategoryNotFoundError,
  ProductImageLimitExceededError,
} from './seller'
import {
  AdminAccessError,
  SelfModerationError,
  AlreadyModeratedError,
  ModerationReasonRequiredError,
  InvalidModerationTransitionError as AdminInvalidModerationTransitionError,
} from './admin'
import {
  BadgeRuleNotFoundError,
  InvalidFilterError,
  InvalidBadgeTransitionError,
  InvalidSearchQueryError,
  InvalidBadgeRuleError,
  ProductBadgeConflictError,
  ProductMetricsCalculationError,
  SearchExecutionError,
  UnauthorizedBadgeMutationError,
  UnauthorizedBadgeRuleMutationError,
} from './product'
import {
  CategoryCircularReferenceError,
  CategoryHasProductsError,
  CategorySlugConflictError,
} from './category'
import {
  EmailDuplicateEventError,
  EmailEventNotFoundError,
  EmailProviderError,
  EmailRetryLimitExceededError,
  EmailTemplateRenderError,
} from './email'
import {
  NotificationNotFoundError,
  NotificationOwnershipError,
} from './notification'
import {
  InvalidPaymentTransitionError,
  LiqPayAmountMismatchError,
  LiqPayConfigError,
  LiqPayPayloadError,
  LiqPaySignatureError,
  LiqPayStatusMappingError,
  PaymentAmountMismatchError,
  PaymentNotFoundError,
  PaymentProviderError as DomainPaymentProviderError,
  PaymentWebhookDuplicateError,
  PaymentWebhookSignatureError,
  RefundNotSupportedError,
  UnsupportedPaymentMethodError,
} from './payment'
import {
  ReviewAlreadyExistsError,
  ReviewModerationReasonRequiredError,
  ReviewNotFoundError,
  ReviewOwnershipError,
  ReviewProductNotFoundError,
  ReviewPurchaseRequiredError,
  ReviewSelfReviewForbiddenError,
} from './review'
import {
  AbuseReportModerationError,
  AbuseReportNotFoundError,
  AbuseReportOwnershipError,
  AbuseReportTargetNotFoundError,
  DuplicateAbuseReportError,
  EvidenceLimitExceededError,
  EvidenceNotFoundError,
  EvidenceOwnershipError,
  EvidenceUploadFailedError,
  InvalidEvidenceFileError,
  UnsupportedAbuseActionError,
} from './abuse-report'
import {
  DisputeEvidenceLimitExceededError,
  DisputeEvidenceUploadError,
  DisputeNotFoundError,
  DisputeOwnershipError,
  DisputeValidationError,
  DuplicateDisputeError,
  InvalidDisputeEvidenceFileError,
  InvalidDisputeTransitionError,
} from './dispute'
import {
  RiskProfileNotFoundError,
  RiskSubjectNotFoundError,
  RiskValidationError,
} from './risk'
import {
  DuplicateLedgerEntryError,
  InsufficientAvailableBalanceError,
  InvalidPayoutTransitionError,
  PayoutNotFoundError,
  PayoutOwnershipError,
  SellerBalanceNotFoundError,
} from './payout'
import {
  CommissionCalculationError,
  CommissionRuleConflictError,
  CommissionRuleNotFoundError,
  InvalidCommissionRuleError,
} from './commission'
import {
  InvalidPromotionCodeError,
  InvalidPromotionTargetError,
  PromotionDeleteConflictError,
  PromotionDuplicateCodeError,
  PromotionExpiredError,
  PromotionInactiveError,
  PromotionMinimumAmountError,
  PromotionNotFoundError,
  PromotionOwnershipError,
  PromotionUsageLimitReachedError,
  PromotionUserLimitReachedError,
} from './promotion'
import {
  DuplicateRefundRequestError,
  InvalidRefundTransitionError,
  RefundAmountExceededError,
  RefundLedgerReversalError,
  RefundOrderNotEligibleError,
  RefundPaymentNotEligibleError,
  RefundRequestNotFoundError,
  RefundRequestOwnershipError,
} from './refund'
import {
  InvalidShippingSelectionError,
  NovaPoshtaCityNotFoundError,
  NovaPoshtaCancelShipmentError,
  NovaPoshtaCreateShipmentError,
  NovaPoshtaTrackingError,
  NovaPoshtaWarehouseNotFoundError,
  ShipmentAlreadyReturnedError,
  ShipmentAlreadyHasTrackingError,
  ShipmentCreationError,
  ShipmentInvalidStateError,
  ShipmentNotFoundError,
  ShipmentOwnershipError,
  ShipmentReturnCreationError,
  ShipmentSyncError,
  ShippingProviderError,
  StoreShippingSettingsRequiredError,
  StoreShippingSettingsNotConfiguredError,
} from './shipping'
import {
  AnalyticsAccessDeniedError,
  AnalyticsAggregationError,
  InvalidAnalyticsRangeError,
} from './analytics'
import { logError } from '@/utils/logger'

export function toErrorResponse(label: string, err: unknown): Response {
  if (err instanceof UnauthorizedError)
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 401 },
    )
  if (
    err instanceof ForbiddenError ||
    err instanceof AddressOwnershipError ||
    err instanceof CartOwnershipError ||
    err instanceof OrderAccessError ||
    err instanceof NotificationOwnershipError ||
    err instanceof StoreOwnershipError ||
    err instanceof ProductOwnershipError ||
    err instanceof UnverifiedSellerError ||
    err instanceof AdminAccessError ||
    err instanceof SellerNotVerifiedError ||
    err instanceof StoreProvisioningRequiredError ||
    err instanceof UnauthorizedBadgeMutationError ||
    err instanceof UnauthorizedBadgeRuleMutationError ||
    err instanceof ReviewOwnershipError ||
    err instanceof ReviewPurchaseRequiredError ||
    err instanceof ReviewSelfReviewForbiddenError ||
    err instanceof AbuseReportOwnershipError ||
    err instanceof EvidenceOwnershipError ||
    err instanceof DisputeOwnershipError ||
    err instanceof PayoutOwnershipError ||
    err instanceof PromotionOwnershipError ||
    err instanceof RefundRequestOwnershipError ||
    err instanceof ShipmentOwnershipError ||
    err instanceof AnalyticsAccessDeniedError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 403 },
    )
  if (
    err instanceof ProfileNotFoundError ||
    err instanceof AddressNotFoundError ||
    err instanceof SellerProfileNotFoundError ||
    err instanceof AdminProfileNotFoundError ||
    err instanceof OrderNotFoundError ||
    err instanceof CheckoutVariantNotFoundError ||
    err instanceof StoreNotFoundError ||
    err instanceof ProductNotFoundError ||
    err instanceof OrderItemNotFoundError ||
    err instanceof CategoryNotFoundError ||
    err instanceof BadgeRuleNotFoundError ||
    err instanceof EmailEventNotFoundError ||
    err instanceof NotificationNotFoundError ||
    err instanceof PaymentNotFoundError ||
    err instanceof ReviewNotFoundError ||
    err instanceof ReviewProductNotFoundError ||
    err instanceof AbuseReportNotFoundError ||
    err instanceof AbuseReportTargetNotFoundError ||
    err instanceof EvidenceNotFoundError ||
    err instanceof DisputeNotFoundError ||
    err instanceof RiskProfileNotFoundError ||
    err instanceof RiskSubjectNotFoundError ||
    err instanceof PayoutNotFoundError ||
    err instanceof CommissionRuleNotFoundError ||
    err instanceof PromotionNotFoundError ||
    err instanceof SellerBalanceNotFoundError ||
    err instanceof RefundRequestNotFoundError ||
    err instanceof ShipmentNotFoundError ||
    err instanceof NovaPoshtaCityNotFoundError ||
    err instanceof NovaPoshtaWarehouseNotFoundError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 404 },
    )
  if (
    err instanceof SellerAlreadyOnboardedError ||
    err instanceof SlugConflictError ||
    err instanceof SlugAlreadyTakenError ||
    err instanceof AlreadyVerifiedError ||
    err instanceof AlreadyModeratedError ||
    err instanceof StoreAlreadyExistsError ||
    err instanceof StoragePathConflictError ||
    err instanceof ProductBadgeConflictError ||
    err instanceof CategorySlugConflictError ||
    err instanceof CategoryHasProductsError ||
    err instanceof CheckoutStockUnavailableError ||
    err instanceof CheckoutPriceChangedError ||
    err instanceof CheckoutProductUnavailableError ||
    err instanceof EmailDuplicateEventError ||
    err instanceof PaymentWebhookDuplicateError ||
    err instanceof ReviewAlreadyExistsError ||
    err instanceof DuplicateAbuseReportError ||
    err instanceof DuplicateDisputeError ||
    err instanceof DuplicateLedgerEntryError ||
    err instanceof CommissionRuleConflictError ||
    err instanceof PromotionDuplicateCodeError ||
    err instanceof PromotionDeleteConflictError ||
    err instanceof DuplicateRefundRequestError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 409 },
    )
  if (
    err instanceof EmptyCartError ||
    err instanceof InactiveProductError ||
    err instanceof InactiveStoreError ||
    err instanceof CheckoutInsufficientStockError ||
    err instanceof InvalidShippingAddressError ||
    err instanceof CheckoutAddressRequiredError ||
    err instanceof InvalidStatusTransitionError ||
    err instanceof InvalidModerationTransitionError ||
    err instanceof AdminInvalidModerationTransitionError ||
    err instanceof InvalidFulfillmentTransitionError ||
    err instanceof InvalidInventoryError ||
    err instanceof SelfModerationError ||
    err instanceof ModerationReasonRequiredError ||
    err instanceof InvalidStoreSlugError ||
    err instanceof InvalidImageFileError ||
    err instanceof InvalidSkuError ||
    err instanceof ProductImageLimitExceededError ||
    err instanceof InvalidBadgeTransitionError ||
    err instanceof InvalidSearchQueryError ||
    err instanceof InvalidFilterError ||
    err instanceof InvalidBadgeRuleError ||
    err instanceof CategoryCircularReferenceError ||
    err instanceof EmailRetryLimitExceededError ||
    err instanceof PaymentAmountMismatchError ||
    err instanceof LiqPayAmountMismatchError ||
    err instanceof PaymentWebhookSignatureError ||
    err instanceof LiqPaySignatureError ||
    err instanceof LiqPayPayloadError ||
    err instanceof LiqPayStatusMappingError ||
    err instanceof InvalidPaymentTransitionError ||
    err instanceof UnsupportedPaymentMethodError ||
    err instanceof RefundNotSupportedError ||
    err instanceof ReviewModerationReasonRequiredError ||
    err instanceof AbuseReportModerationError ||
    err instanceof UnsupportedAbuseActionError ||
    err instanceof InvalidEvidenceFileError ||
    err instanceof EvidenceLimitExceededError ||
    err instanceof DisputeValidationError ||
    err instanceof InvalidDisputeEvidenceFileError ||
    err instanceof DisputeEvidenceLimitExceededError ||
    err instanceof InvalidDisputeTransitionError ||
    err instanceof RiskValidationError ||
    err instanceof InsufficientAvailableBalanceError ||
    err instanceof InvalidPayoutTransitionError ||
    err instanceof CommissionCalculationError ||
    err instanceof InvalidCommissionRuleError ||
    err instanceof InvalidPromotionCodeError ||
    err instanceof InvalidPromotionTargetError ||
    err instanceof PromotionInactiveError ||
    err instanceof PromotionExpiredError ||
    err instanceof PromotionUsageLimitReachedError ||
    err instanceof PromotionUserLimitReachedError ||
    err instanceof PromotionMinimumAmountError ||
    err instanceof InvalidRefundTransitionError ||
    err instanceof RefundAmountExceededError ||
    err instanceof RefundPaymentNotEligibleError ||
    err instanceof RefundOrderNotEligibleError ||
    err instanceof InvalidShippingSelectionError ||
    err instanceof StoreShippingSettingsNotConfiguredError ||
    err instanceof ShipmentAlreadyReturnedError ||
    err instanceof ShipmentAlreadyHasTrackingError ||
    err instanceof ShipmentInvalidStateError ||
    err instanceof StoreShippingSettingsRequiredError ||
    err instanceof InvalidAnalyticsRangeError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 400 },
    )
  if (
    err instanceof UploadFailedError ||
    err instanceof ProductMetricsCalculationError ||
    err instanceof SearchExecutionError ||
    err instanceof EmailProviderError ||
    err instanceof EmailTemplateRenderError ||
    err instanceof DomainPaymentProviderError ||
    err instanceof LiqPayConfigError ||
    err instanceof EvidenceUploadFailedError ||
    err instanceof DisputeEvidenceUploadError ||
    err instanceof RefundLedgerReversalError ||
    err instanceof ShippingProviderError ||
    err instanceof ShipmentCreationError ||
    err instanceof ShipmentReturnCreationError ||
    err instanceof ShipmentSyncError ||
    err instanceof NovaPoshtaCreateShipmentError ||
    err instanceof NovaPoshtaTrackingError ||
    err instanceof NovaPoshtaCancelShipmentError ||
    err instanceof AnalyticsAggregationError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 500 },
    )
  logError(label, err)
  return Response.json(
    { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
    { status: 500 },
  )
}
