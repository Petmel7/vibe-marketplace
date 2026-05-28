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
  InvalidBadgeTransitionError,
  InvalidBadgeRuleError,
  ProductBadgeConflictError,
  ProductMetricsCalculationError,
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
    err instanceof StoreOwnershipError ||
    err instanceof ProductOwnershipError ||
    err instanceof UnverifiedSellerError ||
    err instanceof AdminAccessError ||
    err instanceof SellerNotVerifiedError ||
    err instanceof StoreProvisioningRequiredError ||
    err instanceof UnauthorizedBadgeMutationError ||
    err instanceof UnauthorizedBadgeRuleMutationError
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
    err instanceof PaymentNotFoundError
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
    err instanceof PaymentWebhookDuplicateError
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
    err instanceof RefundNotSupportedError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 400 },
    )
  if (
    err instanceof UploadFailedError ||
    err instanceof ProductMetricsCalculationError ||
    err instanceof EmailProviderError ||
    err instanceof EmailTemplateRenderError ||
    err instanceof DomainPaymentProviderError ||
    err instanceof LiqPayConfigError
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
