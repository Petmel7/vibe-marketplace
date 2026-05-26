import Decimal from 'decimal.js'
import { type Prisma, type OrderStatus } from '@/app/generated/prisma/client'
import { prisma } from '@/lib/prisma'
import { CheckoutStockUnavailableError } from '@/lib/errors/checkout'

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
  userId: string
  cartId: string
  shippingAddressId: string
  note?: string
  totalAmount: Decimal
  items: CheckoutOrderItemCreateInput[]
  stockUpdates: CheckoutStockUpdate[]
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        userId: data.userId,
        status: 'pending' satisfies OrderStatus,
        totalAmount: data.totalAmount,
        shippingAddressId: data.shippingAddressId,
        note: data.note ?? null,
        updatedAt: new Date(),
      },
    })

    await tx.orderItem.createMany({
      data: data.items.map((item) => ({
        ...item,
        orderId: order.id,
      })),
    })

    for (const { variantId, qty } of data.stockUpdates) {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: variantId,
          stock: { gte: qty },
        },
        data: {
          stock: { decrement: qty },
        },
      })

      if (updated.count === 0) {
        const variant = await tx.productVariant.findUnique({
          where: { id: variantId },
          select: { stock: true },
        })

        throw new CheckoutStockUnavailableError(variantId, variant?.stock ?? 0, qty)
      }
    }

    await tx.cartItem.deleteMany({
      where: { cartId: data.cartId },
    })

    return order
  })
}
