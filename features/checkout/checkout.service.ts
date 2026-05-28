import Decimal from 'decimal.js'
import { ProductStatus } from '@/app/generated/prisma/client'
import { requireBuyer } from '@/lib/auth/guards'
import type { ProductStockStatus } from '@/features/products/product.dto'
import type { SessionUser } from '@/features/auth/auth.dto'
import type {
  CheckoutAddressOptionDto,
  CheckoutBlockingIssueDto,
  CheckoutInput,
  CheckoutPreviewInput,
  CheckoutPreviewItemDto,
  CheckoutPreviewResponseDto,
  CheckoutResponseDto,
} from './checkout.dto'
import {
  findShippingAddress,
  getCartWithItems,
  getCartWithItemsByUserId,
  listShippingAddressesByUserId,
  submitCheckoutOrder,
} from './checkout.repository'
import {
  createCheckoutIdentifiers,
  prepareCheckoutPayment,
  resolveHostedCheckoutRedirectUrl,
  resolveCheckoutOrderStatus,
} from '@/features/payments/payment.service'
import {
  EmptyCartError,
  CartOwnershipError,
  InvalidShippingAddressError,
  CheckoutAddressRequiredError,
  CheckoutPriceChangedError,
  CheckoutProductUnavailableError,
  CheckoutStockUnavailableError,
} from '@/lib/errors/checkout'
import { emitOrderCreatedEmailEvent } from '@/features/email/events/email.events'
import { logError } from '@/utils/logger'

const LOW_STOCK_THRESHOLD = 3
const SHIPPING_PLACEHOLDER_AMOUNT = new Decimal(0)

type CheckoutCart = NonNullable<Awaited<ReturnType<typeof getCartWithItems>>>
type CheckoutCartItem = CheckoutCart['items'][number]

type PreparedCheckoutItem = {
  cartItemId: string
  productId: string
  variantId: string
  storeId: string
  productName: string
  storeName: string
  storeSlug: string
  quantity: number
  availableStock: number
  unitPrice: Decimal
  lineTotal: Decimal
  variantLabel: string | null
  imageUrl: string | null
  inStock: boolean
  stockStatus: ProductStockStatus
  productStatus: ProductStatus
  productIsActive: boolean
  storeIsActive: boolean
}

function deriveVariantStockStatus(stock: number): ProductStockStatus {
  if (stock <= 0) return 'OUT_OF_STOCK'
  if (stock <= LOW_STOCK_THRESHOLD) return 'LOW_STOCK'
  return 'IN_STOCK'
}

function resolveVariantLabel(item: CheckoutCartItem): string | null {
  return [item.variant.size, item.variant.color].filter(Boolean).join(' / ') || null
}

function resolveImageUrl(item: CheckoutCartItem): string | null {
  return item.variant.product.images[0]?.url ?? item.variant.product.imageUrl ?? null
}

function resolveUnitPrice(item: CheckoutCartItem): Decimal {
  return item.variant.price != null
    ? new Decimal(item.variant.price.toString())
    : new Decimal(item.variant.product.price.toString())
}

function prepareCheckoutItem(item: CheckoutCartItem): PreparedCheckoutItem {
  const stockStatus = deriveVariantStockStatus(item.variant.stock)
  const unitPrice = resolveUnitPrice(item)

  return {
    cartItemId: item.id,
    productId: item.variant.product.id,
    variantId: item.variant.id,
    storeId: item.variant.product.store.id,
    productName: item.variant.product.name,
    storeName: item.variant.product.store.name,
    storeSlug: item.variant.product.store.slug,
    quantity: item.quantity,
    availableStock: item.variant.stock,
    unitPrice,
    lineTotal: unitPrice.mul(item.quantity),
    variantLabel: resolveVariantLabel(item),
    imageUrl: resolveImageUrl(item),
    inStock: item.variant.stock > 0,
    stockStatus,
    productStatus: item.variant.product.status,
    productIsActive: item.variant.product.isActive,
    storeIsActive: item.variant.product.store.isActive,
  }
}

function toUnavailableMessage(item: PreparedCheckoutItem): string {
  if (item.productStatus !== ProductStatus.PUBLISHED) {
    return `Product "${item.productName}" is not published yet`
  }

  if (!item.productIsActive) {
    return `Product "${item.productName}" is currently unavailable`
  }

  if (!item.storeIsActive) {
    return `Store "${item.storeName}" is currently unavailable`
  }

  return `Variant "${item.variantId}" has only ${item.availableStock} unit(s) available, requested ${item.quantity}`
}

function toPreviewItemDto(item: PreparedCheckoutItem): CheckoutPreviewItemDto {
  return {
    id: item.cartItemId,
    productId: item.productId,
    variantId: item.variantId,
    storeId: item.storeId,
    storeName: item.storeName,
    storeSlug: item.storeSlug,
    productName: item.productName,
    variantLabel: item.variantLabel,
    imageUrl: item.imageUrl,
    quantity: item.quantity,
    unitPrice: item.unitPrice.toFixed(2),
    lineTotal: item.lineTotal.toFixed(2),
    availableStock: item.availableStock,
    inStock: item.inStock,
    stockStatus: item.stockStatus,
  }
}

function toAddressOptionDto(
  address: Awaited<ReturnType<typeof listShippingAddressesByUserId>>[number],
): CheckoutAddressOptionDto {
  return {
    id: address.id,
    label: address.label ?? null,
    fullName: address.fullName,
    phone: address.phone,
    country: address.country,
    city: address.city,
    region: address.region ?? null,
    street: address.street,
    building: address.building,
    apartment: address.apartment ?? null,
    zipCode: address.zipCode ?? null,
    isDefault: address.isDefault,
  }
}

function sumItemCount(items: PreparedCheckoutItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0)
}

function sumSubtotal(items: PreparedCheckoutItem[]): Decimal {
  return items.reduce((sum, item) => sum.plus(item.lineTotal), new Decimal(0))
}

function buildBlockingIssues(
  items: PreparedCheckoutItem[],
  hasAddresses: boolean,
): CheckoutBlockingIssueDto[] {
  const issues: CheckoutBlockingIssueDto[] = []

  if (items.length === 0) {
    issues.push({
      code: 'EMPTY_CART',
      message: 'Your cart is empty',
    })
  }

  if (!hasAddresses) {
    issues.push({
      code: 'ADDRESS_REQUIRED',
      message: 'Add a shipping address to continue to checkout',
    })
  }

  for (const item of items) {
    if (item.productStatus !== ProductStatus.PUBLISHED || !item.productIsActive || !item.storeIsActive) {
      issues.push({
        code: 'PRODUCT_UNAVAILABLE',
        message: toUnavailableMessage(item),
        cartItemId: item.cartItemId,
        productId: item.productId,
        variantId: item.variantId,
      })
      continue
    }

    if (item.availableStock < item.quantity) {
      issues.push({
        code: 'STOCK_UNAVAILABLE',
        message: toUnavailableMessage(item),
        cartItemId: item.cartItemId,
        productId: item.productId,
        variantId: item.variantId,
      })
    }
  }

  return issues
}

async function loadCheckoutCart(userId: string, cartId?: string): Promise<CheckoutCart | null> {
  if (cartId) {
    const cart = await getCartWithItems(cartId)

    if (!cart) {
      return null
    }

    if (cart.userId !== userId) {
      throw new CartOwnershipError()
    }

    return cart
  }

  const cart = await getCartWithItemsByUserId(userId)
  if (cart && cart.userId !== userId) {
    throw new CartOwnershipError()
  }

  return cart
}

function ensureExpectedTotals(
  data: CheckoutInput,
  subtotal: Decimal,
  total: Decimal,
): void {
  if (data.expectedSubtotal) {
    const expectedSubtotal = new Decimal(data.expectedSubtotal)
    if (!expectedSubtotal.equals(subtotal)) {
      throw new CheckoutPriceChangedError(expectedSubtotal.toFixed(2), subtotal.toFixed(2))
    }
  }

  if (data.expectedTotal) {
    const expectedTotal = new Decimal(data.expectedTotal)
    if (!expectedTotal.equals(total)) {
      throw new CheckoutPriceChangedError(expectedTotal.toFixed(2), total.toFixed(2))
    }
  }
}

function assertCheckoutIssues(issues: CheckoutBlockingIssueDto[]): void {
  const firstIssue = issues[0]
  if (!firstIssue) return

  switch (firstIssue.code) {
    case 'EMPTY_CART':
      throw new EmptyCartError()
    case 'ADDRESS_REQUIRED':
      throw new CheckoutAddressRequiredError()
    case 'PRODUCT_UNAVAILABLE':
      throw new CheckoutProductUnavailableError(firstIssue.message)
    case 'STOCK_UNAVAILABLE':
      throw new CheckoutStockUnavailableError(firstIssue.variantId ?? 'unknown', 0, 0)
    default:
      return
  }
}

export async function getCheckoutPreview(
  user: SessionUser,
  input: CheckoutPreviewInput,
): Promise<CheckoutPreviewResponseDto> {
  requireBuyer(user)

  const [cart, addresses] = await Promise.all([
    loadCheckoutCart(user.id, input.cartId),
    listShippingAddressesByUserId(user.id),
  ])

  const preparedItems = (cart?.items ?? []).map(prepareCheckoutItem)
  const addressOptions = addresses.map(toAddressOptionDto)
  const defaultShippingAddress = addressOptions.find((address) => address.isDefault) ?? addressOptions[0] ?? null
  const blockingIssues = buildBlockingIssues(preparedItems, addressOptions.length > 0)
  const subtotal = sumSubtotal(preparedItems)
  const total = subtotal.plus(SHIPPING_PLACEHOLDER_AMOUNT)

  return {
    cartId: cart?.id ?? null,
    items: preparedItems.map(toPreviewItemDto),
    itemCount: sumItemCount(preparedItems),
    subtotal: subtotal.toFixed(2),
    shippingAmount: SHIPPING_PLACEHOLDER_AMOUNT.toFixed(2),
    total: total.toFixed(2),
    defaultShippingAddress,
    addressOptions,
    blockingIssues,
    canCheckout: blockingIssues.length === 0,
  }
}

export async function checkout(
  user: SessionUser,
  data: CheckoutInput,
): Promise<CheckoutResponseDto> {
  requireBuyer(user)

  const cart = await loadCheckoutCart(user.id, data.cartId)
  if (!cart) {
    throw new EmptyCartError('Cart not found')
  }

  const preparedItems = cart.items.map(prepareCheckoutItem)
  if (preparedItems.length === 0) {
    throw new EmptyCartError()
  }

  if (!data.shippingAddressId) {
    throw new CheckoutAddressRequiredError()
  }

  const address = await findShippingAddress(data.shippingAddressId, user.id)
  if (!address) {
    throw new InvalidShippingAddressError()
  }

  const blockingIssues = buildBlockingIssues(preparedItems, true)
  assertCheckoutIssues(blockingIssues)

  const subtotal = sumSubtotal(preparedItems)
  const total = subtotal.plus(SHIPPING_PLACEHOLDER_AMOUNT)
  ensureExpectedTotals(data, subtotal, total)
  const { orderId, paymentId } = createCheckoutIdentifiers()
  const preparedPayment = await prepareCheckoutPayment(
    data.paymentMethod,
    total,
    `${user.id}:${cart.id}:${paymentId}`,
    orderId,
    paymentId,
  )
  const orderStatus = resolveCheckoutOrderStatus(data.paymentMethod)

  const { order, payment } = await submitCheckoutOrder({
    orderId,
    paymentId,
    userId: user.id,
    cartId: cart.id,
    shippingAddressId: address.id,
    note: data.note,
    orderStatus,
    totalAmount: total,
    items: preparedItems.map((item) => ({
      variantId: item.variantId,
      storeId: item.storeId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      productNameSnapshot: item.productName,
      variantSnapshot: item.variantLabel,
      imageSnapshot: item.imageUrl,
      storeNameSnapshot: item.storeName,
      unitPriceSnapshot: item.unitPrice,
    })),
    stockUpdates: preparedItems.map((item) => ({
      variantId: item.variantId,
      qty: item.quantity,
    })),
    payment: {
      provider: preparedPayment.provider,
      providerPaymentId: preparedPayment.providerPaymentId,
      status: preparedPayment.status,
      method: preparedPayment.method,
      amount: total,
      currency: preparedPayment.currency,
      checkoutUrl: preparedPayment.checkoutUrl,
      failureReason: preparedPayment.failureReason,
      paidAt: preparedPayment.paidAt,
      expiresAt: preparedPayment.expiresAt,
      attemptRequestPayload: {
        method: preparedPayment.method,
        orderReference: `${user.id}:${cart.id}:${paymentId}`,
        checkoutAction: preparedPayment.checkoutAction,
      },
      attemptResponsePayload: {
        checkoutUrl: preparedPayment.checkoutUrl,
        nextAction: preparedPayment.nextAction,
        providerPaymentId: preparedPayment.providerPaymentId,
        checkoutAction: preparedPayment.checkoutAction,
      },
    },
  })

  void emitOrderCreatedEmailEvent({ orderId: order.id }).catch((error) => {
    logError('checkout:order-created-email', error)
  })

  return {
    orderId: order.id,
    paymentId: payment.id,
    paymentStatus: payment.status,
    paymentMethod: payment.method,
    checkoutUrl:
      payment.method === 'CARD' ? resolveHostedCheckoutRedirectUrl(payment.id) : payment.checkoutUrl,
    nextAction: preparedPayment.nextAction,
    paymentAction: preparedPayment.checkoutAction,
    totalAmount: total.toFixed(2),
    itemCount: sumItemCount(preparedItems),
    status: order.status,
    createdAt: order.createdAt,
  }
}
