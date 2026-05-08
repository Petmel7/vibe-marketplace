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
} from './seller'
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
    err instanceof UnverifiedSellerError
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
    err instanceof OrderItemNotFoundError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 404 },
    )
  if (
    err instanceof SellerAlreadyOnboardedError ||
    err instanceof SlugConflictError ||
    err instanceof AlreadyVerifiedError
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
    err instanceof InvalidStatusTransitionError ||
    err instanceof InvalidModerationTransitionError ||
    err instanceof InvalidFulfillmentTransitionError ||
    err instanceof InvalidInventoryError
  )
    return Response.json(
      { success: false, error: { message: err.message, code: err.code } },
      { status: 400 },
    )
  logError(label, err)
  return Response.json(
    { success: false, error: { message: 'An unexpected error occurred', code: 'INTERNAL_ERROR' } },
    { status: 500 },
  )
}
