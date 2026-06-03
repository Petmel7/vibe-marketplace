import Decimal from 'decimal.js'
import { CheckoutStockUnavailableError } from '@/lib/errors/checkout'
import { submitCheckoutOrderWithPayment } from '@/features/payments/payment.repository'
import { type PaymentMethod, type PaymentProvider, type PaymentStatus, type Prisma } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'

const checkoutCartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              store: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { position: 'asc' }],
              },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.CartInclude

export async function getCartWithItems(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: checkoutCartInclude,
  })
}

export async function getCartWithItemsByUserId(userId: string) {
  return prisma.cart.findUnique({
    where: { userId },
    include: checkoutCartInclude,
  })
}

export async function findShippingAddress(id: string, userId: string) {
  return prisma.shippingAddress.findFirst({ where: { id, userId } })
}

export async function listShippingAddressesByUserId(userId: string) {
  return prisma.shippingAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
}

type CheckoutOrderItemCreateInput = {
  variantId: string
  storeId: string
  quantity: number
  unitPrice: Decimal
  productNameSnapshot: string
  variantSnapshot: string | null
  imageSnapshot: string | null
  storeNameSnapshot: string
  unitPriceSnapshot: Decimal
}

type CheckoutStockUpdate = {
  variantId: string
  qty: number
}

export async function submitCheckoutOrder(data: {
  orderId: string
  paymentId: string
  userId: string
  cartId: string
  shippingAddressId: string
  note?: string
  orderStatus: string
  subtotalAmount: Decimal
  discountAmount: Decimal
  totalAmount: Decimal
  items: CheckoutOrderItemCreateInput[]
  stockUpdates: CheckoutStockUpdate[]
  promotion: {
    promotionId: string
    promotionCode: string
    discountAmount: Decimal
    subtotalAmount: Decimal
    userId: string
  } | null
  payment: {
    provider: PaymentProvider
    providerPaymentId: string | null
    status: PaymentStatus
    method: PaymentMethod
    amount: Decimal
    currency: string
    checkoutUrl: string | null
    failureReason: string | null
    paidAt: Date | null
    expiresAt: Date | null
    attemptRequestPayload: Prisma.InputJsonValue
    attemptResponsePayload?: Prisma.InputJsonValue
    attemptErrorMessage?: string | null
  }
}) {
  try {
    return await submitCheckoutOrderWithPayment(data)
  } catch (error) {
    if (error instanceof CheckoutStockUnavailableError) {
      throw error
    }

    throw error
  }
}
