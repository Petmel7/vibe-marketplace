import Decimal from 'decimal.js'
import { prisma } from '@/lib/prisma'
import type { OrderStatus } from '@/app/generated/prisma/client'

// ---------------------------------------------------------------------------
// Cart
// ---------------------------------------------------------------------------

export async function getCartWithItems(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                include: { store: true },
              },
            },
          },
        },
      },
    },
  })
}

// ---------------------------------------------------------------------------
// Shipping address
// ---------------------------------------------------------------------------

export async function findShippingAddress(id: string, userId: string) {
  return prisma.shippingAddress.findFirst({ where: { id, userId } })
}

// ---------------------------------------------------------------------------
// Order creation
// ---------------------------------------------------------------------------

export async function createOrder(data: {
  userId: string
  status: string
  totalAmount: Decimal
  shippingAddressId?: string
  note?: string
}) {
  return prisma.order.create({
    data: {
      userId: data.userId,
      status: data.status as OrderStatus,
      totalAmount: data.totalAmount,
      shippingAddressId: data.shippingAddressId ?? null,
      note: data.note ?? null,
      updatedAt: new Date(),
    },
  })
}

// ---------------------------------------------------------------------------
// Order items
// ---------------------------------------------------------------------------

export async function createOrderItems(
  items: Array<{
    orderId: string
    variantId: string
    storeId: string
    quantity: number
    unitPrice: Decimal
    productNameSnapshot: string
    variantSnapshot: string | null
    imageSnapshot: string | null
    storeNameSnapshot: string
    unitPriceSnapshot: Decimal
  }>,
): Promise<void> {
  for (const item of items) {
    await prisma.orderItem.create({ data: item })
  }
}

// ---------------------------------------------------------------------------
// Stock management
// ---------------------------------------------------------------------------

export async function decrementVariantStocks(
  updates: Array<{ variantId: string; qty: number }>,
): Promise<void> {
  for (const { variantId, qty } of updates) {
    await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock: { decrement: qty } },
    })
  }
}

// ---------------------------------------------------------------------------
// Cart cleanup
// ---------------------------------------------------------------------------

export async function clearCartItems(cartId: string): Promise<void> {
  await prisma.cartItem.deleteMany({ where: { cartId } })
}
