import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/features/checkout/checkout.repository')
vi.mock('@/lib/auth/guards')
vi.mock('@/features/email/events/email.events', () => ({
  emitOrderCreatedEmailEvent: vi.fn(),
}))
vi.mock('@/features/notifications/events/notification.events', () => ({
  emitOrderCreatedNotificationEvent: vi.fn(),
  emitSellerNewOrderNotificationEventsForOrder: vi.fn(),
}))
vi.mock('@/features/payments/payment.service', () => ({
  createCheckoutIdentifiers: vi.fn(),
  prepareCheckoutPayment: vi.fn(),
  resolveHostedCheckoutRedirectUrl: vi.fn(),
  resolveCheckoutOrderStatus: vi.fn(),
}))
vi.mock('@/features/payouts/payouts.service', () => ({
  materializeSellerFinanceForOrderAction: vi.fn(),
}))
vi.mock('@/features/promotions/promotions.service', () => ({
  buildCheckoutPromotionPreview: vi.fn(),
  normalizeCouponCode: vi.fn(),
  resolvePromotionForCheckout: vi.fn(),
}))
vi.mock('@/features/shipping/shipping.service', () => ({
  buildCheckoutDeliverySelectionDto: vi.fn(),
  estimateCheckoutDeliveryTotal: vi.fn(),
  resolveCheckoutDeliverySelection: vi.fn(),
}))

import * as repo from '@/features/checkout/checkout.repository'
import * as guards from '@/lib/auth/guards'
import { emitOrderCreatedEmailEvent } from '@/features/email/events/email.events'
import {
  emitOrderCreatedNotificationEvent,
  emitSellerNewOrderNotificationEventsForOrder,
} from '@/features/notifications/events/notification.events'
import * as paymentService from '@/features/payments/payment.service'
import * as payoutService from '@/features/payouts/payouts.service'
import * as promotionsService from '@/features/promotions/promotions.service'
import * as shippingService from '@/features/shipping/shipping.service'
import { applyCheckoutPromotion, checkout, getCheckoutPreview } from '@/features/checkout/checkout.service'
import {
  CartOwnershipError,
  CheckoutPriceChangedError,
  CheckoutProductUnavailableError,
  CheckoutStockUnavailableError,
  EmptyCartError,
  InvalidShippingAddressError,
} from '@/lib/errors/checkout'
import { InvalidShippingSelectionError } from '@/lib/errors/shipping'
import type { SessionUser } from '@/features/auth/auth.dto'

const mockRepo = vi.mocked(repo)
const mockGuards = vi.mocked(guards)
const mockEmitOrderCreatedEmailEvent = vi.mocked(emitOrderCreatedEmailEvent)
const mockEmitOrderCreatedNotificationEvent = vi.mocked(emitOrderCreatedNotificationEvent)
const mockEmitSellerNewOrderNotificationEventsForOrder = vi.mocked(
  emitSellerNewOrderNotificationEventsForOrder,
)
const mockPaymentService = vi.mocked(paymentService)
const mockPayoutService = vi.mocked(payoutService)
const mockPromotionsService = vi.mocked(promotionsService)
const mockShippingService = vi.mocked(shippingService)

const USER_ID = 'user-0000-0000-0000-000000000001'
const CART_ID = 'cart-0000-0000-0000-000000000002'
const ADDRESS_ID = 'addr-0000-0000-0000-000000000003'
const ORDER_ID = 'ordr-0000-0000-0000-000000000004'
const VARIANT_ID = 'vari-0000-0000-0000-000000000005'
const STORE_ID = 'stor-0000-0000-0000-000000000006'
const PRODUCT_ID = 'prod-0000-0000-0000-000000000007'

const mockUser: SessionUser = {
  id: USER_ID,
  email: 'buyer@example.com',
  roles: [],
}

const mockOrder = {
  id: ORDER_ID,
  userId: USER_ID,
  status: 'confirmed',
  totalAmount: { toString: () => '99.98' },
  shippingAddressId: ADDRESS_ID,
  note: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

const mockPayment = {
  id: 'paym-0000-0000-0000-000000000009',
  orderId: ORDER_ID,
  provider: 'MANUAL',
  providerPaymentId: 'cod:test',
  status: 'PENDING',
  method: 'CASH_ON_DELIVERY',
  amount: { toString: () => '99.98' },
  currency: 'UAH',
  checkoutUrl: null,
  failureReason: null,
  paidAt: null,
  expiresAt: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

function makeAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: ADDRESS_ID,
    userId: USER_ID,
    label: 'Home',
    fullName: 'John Doe',
    phone: '+380000000000',
    country: 'UA',
    city: 'Kyiv',
    region: null,
    street: 'Main St',
    building: '1',
    apartment: null,
    zipCode: null,
    isDefault: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeStore(overrides: Record<string, unknown> = {}) {
  return {
    id: STORE_ID,
    ownerId: 'owner-id',
    name: 'Test Store',
    slug: 'test-store',
    description: null,
    logoUrl: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: PRODUCT_ID,
    storeId: STORE_ID,
    categoryId: null,
    name: 'Test Shirt',
    description: null,
    price: { toString: () => '49.99' },
    imageUrl: '/img/shirt.jpg',
    isActive: true,
    sku: null,
    isHit: false,
    isNew: false,
    status: 'PUBLISHED',
    createdAt: new Date(),
    updatedAt: new Date(),
    searchVector: null,
    store: makeStore(),
    images: [
      {
        id: 'image-1',
        productId: PRODUCT_ID,
        url: '/img/shirt-primary.jpg',
        storagePath: 'products/shirt-primary.jpg',
        altText: null,
        position: 0,
        isPrimary: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    ...overrides,
  }
}

function makeVariant(overrides: Record<string, unknown> = {}) {
  return {
    id: VARIANT_ID,
    productId: PRODUCT_ID,
    sku: 'SKU-001',
    size: 'M' as string | null,
    color: 'Blue' as string | null,
    price: null as null | { toString(): string },
    stock: 10,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: makeProduct(),
    ...overrides,
  }
}

function makeCartItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item-0000-0000-0000-000000000008',
    cartId: CART_ID,
    variantId: VARIANT_ID,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    variant: makeVariant(),
    ...overrides,
  }
}

function makeCart(
  overrides: Record<string, unknown> = {},
  items: ReturnType<typeof makeCartItem>[] = [makeCartItem()],
) {
  return {
    id: CART_ID,
    userId: USER_ID,
    sessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items,
    ...overrides,
  }
}

const checkoutInput = {
  cartId: CART_ID,
  shippingAddressId: ADDRESS_ID,
  acceptedPrivacy: true as const,
  paymentMethod: 'CASH_ON_DELIVERY' as const,
}

beforeEach(() => {
  vi.resetAllMocks()
  mockGuards.requireBuyer.mockReturnValue(undefined)
  mockEmitOrderCreatedEmailEvent.mockResolvedValue(null)
  mockEmitOrderCreatedNotificationEvent.mockResolvedValue(null)
  mockEmitSellerNewOrderNotificationEventsForOrder.mockResolvedValue([])
  mockPayoutService.materializeSellerFinanceForOrderAction.mockResolvedValue({
    orderId: ORDER_ID,
    createdCommissionCount: 1,
    createdLedgerEntryCount: 1,
    skippedOrderItemCount: 0,
  } as never)
  mockPaymentService.prepareCheckoutPayment.mockResolvedValue({
    provider: 'MANUAL',
    providerPaymentId: mockPayment.id,
    status: 'PENDING',
    method: 'CASH_ON_DELIVERY',
    amount: '99.98',
    currency: 'UAH',
    checkoutUrl: null,
    failureReason: null,
    paidAt: null,
    expiresAt: null,
    nextAction: 'AWAITING_CASH_ON_DELIVERY',
    checkoutAction: null,
  } as never)
  mockPaymentService.createCheckoutIdentifiers.mockReturnValue({
    orderId: ORDER_ID,
    paymentId: 'paym-0000-0000-0000-000000000009',
  })
  mockPaymentService.resolveHostedCheckoutRedirectUrl.mockImplementation((paymentId: string) => `/api/payments/checkout/${paymentId}`)
  mockPaymentService.resolveCheckoutOrderStatus.mockReturnValue('confirmed')
  mockPromotionsService.normalizeCouponCode.mockImplementation((code) =>
    code ? code.trim().toUpperCase() : null,
  )
  mockPromotionsService.resolvePromotionForCheckout.mockResolvedValue(null)
  mockPromotionsService.buildCheckoutPromotionPreview.mockImplementation(({ cartId, subtotal, appliedPromotion }) => {
    const discountAmount = appliedPromotion?.discountAmount ?? '0.00'
    return {
      cartId,
      subtotal: subtotal.toFixed(2),
      discountAmount,
      total: subtotal.minus(discountAmount).toFixed(2),
      appliedPromotion: appliedPromotion
        ? {
            id: appliedPromotion.id,
            code: appliedPromotion.code,
            name: appliedPromotion.name,
            ownerType: appliedPromotion.ownerType,
            storeId: appliedPromotion.storeId,
            type: appliedPromotion.type,
            discountType: appliedPromotion.discountType,
            discountValue: appliedPromotion.discountValue,
            discountAmount: appliedPromotion.discountAmount,
          }
        : null,
    }
  })
  mockShippingService.buildCheckoutDeliverySelectionDto.mockImplementation((input) => ({
    supportedDeliveryTypes: ['NOVA_POSHTA_WAREHOUSE', 'NOVA_POSHTA_COURIER'],
    selectedDeliveryType: input.deliveryType ?? null,
    recipientName: input.recipientName ?? null,
    recipientFirstName: input.recipientFirstName ?? null,
    recipientLastName: input.recipientLastName ?? null,
    recipientMiddleName: input.recipientMiddleName ?? null,
    recipientPhone: input.recipientPhone ?? null,
    recipientCityRef: input.recipientCityRef ?? null,
    recipientCityName: input.recipientCityName ?? null,
    recipientStreet: input.recipientStreet ?? null,
    recipientBuilding: input.recipientBuilding ?? null,
    recipientApartment: input.recipientApartment ?? null,
    recipientWarehouseRef: input.recipientWarehouseRef ?? null,
    recipientWarehouseName: input.recipientWarehouseName ?? null,
    estimatedCost: null,
    currency: 'UAH',
    isComplete: false,
  }))
  mockShippingService.estimateCheckoutDeliveryTotal.mockResolvedValue({
    estimatedCost: '0.00',
    currency: 'UAH',
  })
  mockShippingService.resolveCheckoutDeliverySelection.mockResolvedValue(null)
  mockRepo.submitCheckoutOrder.mockResolvedValue(
    {
      order: mockOrder,
      payment: mockPayment,
    } as unknown as Awaited<ReturnType<typeof mockRepo.submitCheckoutOrder>>,
  )
  mockRepo.listShippingAddressesByUserId.mockResolvedValue(
    [makeAddress()] as unknown as Awaited<ReturnType<typeof mockRepo.listShippingAddressesByUserId>>,
  )
})

describe('checkout preview', () => {
  it('returns cart items, price snapshots, default shipping address, and no blocking issues for a valid cart', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    const preview = await getCheckoutPreview(mockUser, { cartId: CART_ID })

    expect(preview.cartId).toBe(CART_ID)
    expect(preview.itemCount).toBe(2)
    expect(preview.subtotal).toBe('99.98')
    expect(preview.discountAmount).toBe('0.00')
    expect(preview.shippingAmount).toBe('0.00')
    expect(preview.total).toBe('99.98')
    expect(preview.appliedPromotion).toBeNull()
    expect(preview.defaultShippingAddress?.id).toBe(ADDRESS_ID)
    expect(preview.addressOptions).toHaveLength(1)
    expect(preview.deliverySelection.supportedDeliveryTypes).toEqual([
      'NOVA_POSHTA_WAREHOUSE',
      'NOVA_POSHTA_COURIER',
    ])
    expect(preview.blockingIssues).toEqual([])
    expect(preview.canCheckout).toBe(true)
    expect(preview.items[0].storeId).toBe(STORE_ID)
    expect(preview.items[0].storeName).toBe('Test Store')
    expect(preview.items[0].storeSlug).toBe('test-store')
    expect(preview.items[0].imageUrl).toBe('/img/shirt-primary.jpg')
  })

  it('returns blocking issues for empty carts without throwing', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, []) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.listShippingAddressesByUserId.mockResolvedValue([])

    const preview = await getCheckoutPreview(mockUser, { cartId: CART_ID })

    expect(preview.items).toEqual([])
    expect(preview.canCheckout).toBe(false)
    expect(preview.blockingIssues.map((issue) => issue.code)).toEqual([
      'EMPTY_CART',
      'ADDRESS_REQUIRED',
    ])
  })

  it('uses the buyer cart when no cartId is provided', async () => {
    mockRepo.getCartWithItemsByUserId.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItemsByUserId>>,
    )

    const preview = await getCheckoutPreview(mockUser, {})

    expect(mockRepo.getCartWithItemsByUserId).toHaveBeenCalledWith(USER_ID)
    expect(preview.cartId).toBe(CART_ID)
  })

  it('does not require a saved shipping address in preview when Nova Poshta warehouse delivery is complete', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.listShippingAddressesByUserId.mockResolvedValue([])
    mockShippingService.buildCheckoutDeliverySelectionDto.mockReturnValueOnce({
      supportedDeliveryTypes: ['NOVA_POSHTA_WAREHOUSE', 'NOVA_POSHTA_COURIER'],
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
      estimatedCost: null,
      currency: 'UAH',
      isComplete: true,
    })
    mockShippingService.resolveCheckoutDeliverySelection.mockResolvedValueOnce({
      provider: 'NOVA_POSHTA',
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
      estimatedCost: '80.00',
      currency: 'UAH',
    } as never)
    mockShippingService.estimateCheckoutDeliveryTotal.mockResolvedValueOnce({
      estimatedCost: '80.00',
      currency: 'UAH',
    })

    const preview = await getCheckoutPreview(mockUser, {
      cartId: CART_ID,
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
    })

    expect(preview.blockingIssues.map((issue) => issue.code)).not.toContain('ADDRESS_REQUIRED')
    expect(preview.canCheckout).toBe(true)
    expect(preview.deliverySelection.isComplete).toBe(true)
  })

  it('includes applied automatic promotion totals in checkout preview', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockPromotionsService.resolvePromotionForCheckout.mockResolvedValueOnce({
      id: 'promo-1',
      code: 'AUTO10',
      name: 'Automatic 10%',
      ownerType: 'MARKETPLACE',
      storeId: null,
      type: 'AUTOMATIC_DISCOUNT',
      discountType: 'PERCENTAGE',
      discountValue: '10.00',
      discountAmount: '10.00',
      eligibleSubtotal: '99.98',
    })

    const preview = await getCheckoutPreview(mockUser, { cartId: CART_ID })

    expect(preview.discountAmount).toBe('10.00')
    expect(preview.total).toBe('89.98')
    expect(preview.appliedPromotion?.code).toBe('AUTO10')
  })
})

describe('checkout submit', () => {
  it('creates an order atomically and returns the checkout response DTO', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    const result = await checkout(mockUser, checkoutInput)

    expect(mockRepo.submitCheckoutOrder).toHaveBeenCalledOnce()
    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.orderId).toBe(ORDER_ID)
    expect(payload.paymentId).toBe(mockPayment.id)
    expect(payload.cartId).toBe(CART_ID)
    expect(payload.shippingAddressId).toBe(ADDRESS_ID)
    expect(payload.deliverySelection).toBeNull()
    expect(payload.orderStatus).toBe('confirmed')
    expect(payload.promotion).toBeNull()
    expect(payload.stockUpdates).toEqual([{ variantId: VARIANT_ID, qty: 2 }])
    expect(payload.payment.method).toBe('CASH_ON_DELIVERY')
    expect(payload.items[0]).toMatchObject({
      variantId: VARIANT_ID,
      storeId: STORE_ID,
      quantity: 2,
      productNameSnapshot: 'Test Shirt',
      variantSnapshot: 'M / Blue',
      imageSnapshot: '/img/shirt-primary.jpg',
      storeNameSnapshot: 'Test Store',
    })

    expect(result).toMatchObject({
      orderId: ORDER_ID,
      paymentId: mockPayment.id,
      paymentStatus: 'PENDING',
      paymentMethod: 'CASH_ON_DELIVERY',
      paymentAction: null,
      nextAction: 'AWAITING_CASH_ON_DELIVERY',
      totalAmount: '99.98',
      itemCount: 2,
      status: 'confirmed',
    })
    expect(mockEmitOrderCreatedEmailEvent).toHaveBeenCalledWith({ orderId: ORDER_ID })
    expect(mockEmitOrderCreatedNotificationEvent).toHaveBeenCalledWith({ orderId: ORDER_ID })
    expect(mockEmitSellerNewOrderNotificationEventsForOrder).toHaveBeenCalledWith({ orderId: ORDER_ID })
    expect(mockPayoutService.materializeSellerFinanceForOrderAction).toHaveBeenCalledWith(ORDER_ID)
  })

  it('applies coupon discounts during checkout submit and persists promotion snapshot input', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockPromotionsService.resolvePromotionForCheckout.mockResolvedValueOnce({
      id: 'promo-1',
      code: 'SAVE10',
      name: 'Save 10',
      ownerType: 'MARKETPLACE',
      storeId: null,
      type: 'COUPON_CODE',
      discountType: 'FIXED_AMOUNT',
      discountValue: '10.00',
      discountAmount: '10.00',
      eligibleSubtotal: '99.98',
    })

    const result = await checkout(mockUser, {
      ...checkoutInput,
      couponCode: 'save10',
      expectedTotal: '89.98',
    })

    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(mockPromotionsService.resolvePromotionForCheckout).toHaveBeenCalledWith({
      userId: USER_ID,
      items: expect.arrayContaining([
        expect.objectContaining({
          storeId: STORE_ID,
          productId: PRODUCT_ID,
          lineTotal: expect.anything(),
        }),
      ]),
      couponCode: 'SAVE10',
    })
    expect(payload.totalAmount.toFixed(2)).toBe('89.98')
    expect(payload.discountAmount.toFixed(2)).toBe('10.00')
    expect(payload.promotion).toMatchObject({
      promotionId: 'promo-1',
      promotionCode: 'SAVE10',
      userId: USER_ID,
      ownerType: 'MARKETPLACE',
      storeId: null,
    })
    expect(result.totalAmount).toBe('89.98')
  })

  it('applies coupon code preview through the checkout promotion endpoint service helper', async () => {
    mockRepo.getCartWithItemsByUserId.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItemsByUserId>>,
    )
    mockPromotionsService.resolvePromotionForCheckout.mockResolvedValueOnce({
      id: 'promo-2',
      code: 'FIXED15',
      name: 'Fixed 15',
      ownerType: 'MARKETPLACE',
      storeId: null,
      type: 'COUPON_CODE',
      discountType: 'FIXED_AMOUNT',
      discountValue: '15.00',
      discountAmount: '15.00',
      eligibleSubtotal: '99.98',
    })

    const result = await applyCheckoutPromotion(mockUser, { couponCode: 'fixed15' })

    expect(result.cartId).toBe(CART_ID)
    expect(result.subtotal).toBe('99.98')
    expect(result.discountAmount).toBe('15.00')
    expect(result.total).toBe('84.98')
    expect(result.appliedPromotion?.code).toBe('FIXED15')
  })

  it('applies seller coupon discounts only to eligible cart items', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [
        makeCartItem(),
        makeCartItem({
          id: 'item-0000-0000-0000-000000000099',
          variant: makeVariant({
            id: 'vari-0000-0000-0000-000000000099',
            product: makeProduct({
              id: 'prod-0000-0000-0000-000000000099',
              storeId: 'stor-0000-0000-0000-000000000099',
              store: makeStore({
                id: 'stor-0000-0000-0000-000000000099',
                name: 'Other Store',
                slug: 'other-store',
              }),
            }),
          }),
        }),
      ]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockPromotionsService.resolvePromotionForCheckout.mockResolvedValueOnce({
      id: 'promo-seller-1',
      code: 'STORE20',
      name: 'Store 20%',
      ownerType: 'SELLER',
      storeId: STORE_ID,
      type: 'COUPON_CODE',
      discountType: 'PERCENTAGE',
      discountValue: '20.00',
      discountAmount: '20.00',
      eligibleSubtotal: '99.98',
    })

    const result = await checkout(mockUser, {
      ...checkoutInput,
      couponCode: 'store20',
      expectedTotal: '179.96',
    })

    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.discountAmount.toFixed(2)).toBe('20.00')
    expect(payload.promotion).toMatchObject({
      promotionId: 'promo-seller-1',
      promotionCode: 'STORE20',
      ownerType: 'SELLER',
      storeId: STORE_ID,
    })
    expect(payload.promotion?.eligibleSubtotalAmount.toFixed(2)).toBe('99.98')
    expect(result.totalAmount).toBe('179.96')
  })

  it('does not fail checkout when order created email enqueue fails', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockEmitOrderCreatedEmailEvent.mockRejectedValueOnce(new Error('email down'))

    const result = await checkout(mockUser, checkoutInput)

    expect(result.orderId).toBe(ORDER_ID)
  })

  it('does not fail checkout when order created notification enqueue fails', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockEmitOrderCreatedNotificationEvent.mockRejectedValueOnce(new Error('notifications down'))

    const result = await checkout(mockUser, checkoutInput)

    expect(result.orderId).toBe(ORDER_ID)
  })

  it('does not fail checkout when seller new order notification enqueue fails for cash on delivery', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockEmitSellerNewOrderNotificationEventsForOrder.mockRejectedValueOnce(
      new Error('notifications down'),
    )

    const result = await checkout(mockUser, checkoutInput)

    expect(result.orderId).toBe(ORDER_ID)
  })

  it('returns payment fields for card checkout skeleton responses', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )
    mockPaymentService.prepareCheckoutPayment.mockResolvedValueOnce({
      provider: 'LIQPAY',
      providerPaymentId: mockPayment.id,
      status: 'PROCESSING',
      method: 'CARD',
      amount: '99.98',
      currency: 'UAH',
      checkoutUrl: '/api/payments/checkout/paym-0000-0000-0000-000000000009',
      failureReason: null,
      paidAt: null,
      expiresAt: new Date('2026-01-01'),
      nextAction: 'AWAITING_PROVIDER_CONFIRMATION',
      checkoutAction: {
        provider: 'LIQPAY',
        checkoutAction: 'POST_FORM',
        checkoutUrl: 'https://www.liqpay.ua/api/3/checkout',
        data: 'encoded-data',
        signature: 'encoded-signature',
        paymentId: mockPayment.id,
        orderId: ORDER_ID,
      },
    } as never)
    mockPaymentService.resolveCheckoutOrderStatus.mockReturnValueOnce('pending')
    mockRepo.submitCheckoutOrder.mockResolvedValueOnce({
      order: { ...mockOrder, status: 'pending' },
      payment: { ...mockPayment, provider: 'LIQPAY', status: 'PROCESSING', method: 'CARD' },
    } as never)

    const result = await checkout(mockUser, {
      ...checkoutInput,
      paymentMethod: 'CARD',
    })

    expect(result.paymentStatus).toBe('PROCESSING')
    expect(result.paymentMethod).toBe('CARD')
    expect(result.nextAction).toBe('AWAITING_PROVIDER_CONFIRMATION')
    expect(result.checkoutUrl).toBe(`/api/payments/checkout/${mockPayment.id}`)
    expect(result.paymentAction).toMatchObject({
      provider: 'LIQPAY',
      checkoutAction: 'POST_FORM',
      paymentId: mockPayment.id,
      orderId: ORDER_ID,
    })
    expect(result.status).toBe('pending')
    expect(mockEmitSellerNewOrderNotificationEventsForOrder).not.toHaveBeenCalled()
  })

  it('blocks empty carts', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(EmptyCartError)
  })

  it('blocks carts owned by another user', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({ userId: 'other-user-id' }) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(CartOwnershipError)
  })

  it('requires either a shipping address or Nova Poshta delivery selection at submit time', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )

    await expect(
      checkout(mockUser, {
        cartId: CART_ID,
        shippingAddressId: null,
        acceptedPrivacy: true,
        paymentMethod: 'CASH_ON_DELIVERY',
      }),
    ).rejects.toThrow(InvalidShippingSelectionError)
  })

  it('validates shipping address ownership', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(null)

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      InvalidShippingAddressError,
    )
  })

  it('blocks unpublished products', async () => {
    const item = makeCartItem({
      variant: makeVariant({
        product: makeProduct({ status: 'PENDING_REVIEW' }),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutProductUnavailableError,
    )
  })

  it('blocks inactive stores', async () => {
    const item = makeCartItem({
      variant: makeVariant({
        product: makeProduct({
          store: makeStore({ isActive: false }),
        }),
      }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutProductUnavailableError,
    )
  })

  it('blocks insufficient stock', async () => {
    const item = makeCartItem({
      quantity: 5,
      variant: makeVariant({ stock: 3 }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(checkout(mockUser, checkoutInput)).rejects.toThrow(
      CheckoutStockUnavailableError,
    )
  })

  it('blocks stale totals when prices changed since preview', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    await expect(
      checkout(mockUser, {
        ...checkoutInput,
        expectedSubtotal: '50.00',
        expectedTotal: '50.00',
      }),
    ).rejects.toThrow(CheckoutPriceChangedError)
  })

  it('uses variant price snapshots when the variant overrides the base price', async () => {
    const item = makeCartItem({
      quantity: 1,
      variant: makeVariant({ price: { toString: () => '29.99' } }),
    })
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart({}, [item]) as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockRepo.findShippingAddress.mockResolvedValue(
      makeAddress() as unknown as Awaited<ReturnType<typeof mockRepo.findShippingAddress>>,
    )

    const result = await checkout(mockUser, checkoutInput)

    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.items[0].unitPriceSnapshot.toString()).toBe('29.99')
    expect(result.totalAmount).toBe('29.99')
  })

  it('passes Nova Poshta shipment selection into checkout submission payload', async () => {
    mockRepo.getCartWithItems.mockResolvedValue(
      makeCart() as unknown as Awaited<ReturnType<typeof mockRepo.getCartWithItems>>,
    )
    mockShippingService.buildCheckoutDeliverySelectionDto.mockReturnValueOnce({
      supportedDeliveryTypes: ['NOVA_POSHTA_WAREHOUSE', 'NOVA_POSHTA_COURIER'],
      selectedDeliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
      estimatedCost: null,
      currency: 'UAH',
      isComplete: true,
    })
    mockShippingService.estimateCheckoutDeliveryTotal.mockResolvedValueOnce({
      estimatedCost: '80.00',
      currency: 'UAH',
    })
    mockShippingService.resolveCheckoutDeliverySelection.mockResolvedValueOnce({
      provider: 'NOVA_POSHTA',
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientStreet: null,
      recipientBuilding: null,
      recipientApartment: null,
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
      estimatedCost: null,
      currency: 'UAH',
    } as never)

    await checkout(mockUser, {
      cartId: CART_ID,
      shippingAddressId: null,
      acceptedPrivacy: true,
      paymentMethod: 'CASH_ON_DELIVERY',
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientName: 'John Doe',
      recipientFirstName: 'John',
      recipientLastName: 'Doe',
      recipientMiddleName: null,
      recipientPhone: '+380000000000',
      recipientCityRef: 'city-ref',
      recipientCityName: 'Kyiv',
      recipientWarehouseRef: 'warehouse-ref',
      recipientWarehouseName: 'Warehouse 1',
    })

    const payload = mockRepo.submitCheckoutOrder.mock.calls[0][0]
    expect(payload.shippingAddressId).toBeNull()
    expect(payload.deliverySelection).toMatchObject({
      provider: 'NOVA_POSHTA',
      deliveryType: 'NOVA_POSHTA_WAREHOUSE',
      recipientCityRef: 'city-ref',
      recipientWarehouseRef: 'warehouse-ref',
    })
  })
})
