import Decimal from 'decimal.js'
import { requireBuyer } from '@/lib/auth/guards'
import type { SessionUser } from '@/features/auth/auth.dto'
import type { CheckoutInput, CheckoutResponseDto } from './checkout.dto'
import {
  getCartWithItems,
  findShippingAddress,
  createOrder,
  createOrderItems,
  decrementVariantStocks,
  clearCartItems,
} from './checkout.repository'
import {
  EmptyCartError,
  CartOwnershipError,
  InactiveProductError,
  InactiveStoreError,
  CheckoutInsufficientStockError,
  InvalidShippingAddressError,
} from '@/lib/errors/checkout'

export async function checkout(
  user: SessionUser,
  data: CheckoutInput,
): Promise<CheckoutResponseDto> {
  requireBuyer(user)

  // 1. Load cart
  const cart = await getCartWithItems(data.cartId)
  if (!cart) throw new EmptyCartError('Cart not found')

  // 2. Verify ownership
  if (cart.userId !== user.id) throw new CartOwnershipError()

  // 3. Ensure cart has items
  if (cart.items.length === 0) throw new EmptyCartError()

  // 4. Validate shipping address
  const address = await findShippingAddress(data.shippingAddressId, user.id)
  if (!address) throw new InvalidShippingAddressError()

  // 5. Validate each item and build order item data
  let total = new Decimal(0)
  let itemCount = 0

  const orderItemData: Array<{
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
  }> = []

  const stockUpdates: Array<{ variantId: string; qty: number }> = []

  for (const item of cart.items) {
    const variant = item.variant
    const product = variant.product
    const store = product.store

    if (!product.isActive) throw new InactiveProductError(product.name)
    if (!store.isActive) throw new InactiveStoreError(store.name)
    if (item.quantity > variant.stock) {
      throw new CheckoutInsufficientStockError(variant.id, variant.stock, item.quantity)
    }

    // Resolve price: variant price takes precedence over product base price
    const unitPrice =
      variant.price != null
        ? new Decimal(variant.price.toString())
        : new Decimal(product.price.toString())

    const lineTotal = unitPrice.mul(item.quantity)
    total = total.plus(lineTotal)
    itemCount += item.quantity

    // Build variant snapshot label (e.g. "M / Blue")
    const variantSnapshot =
      [variant.size, variant.color].filter(Boolean).join(' / ') || null

    orderItemData.push({
      orderId: '', // will be filled after order creation
      variantId: variant.id,
      storeId: store.id,
      quantity: item.quantity,
      unitPrice: unitPrice,
      productNameSnapshot: product.name,
      variantSnapshot,
      imageSnapshot: product.imageUrl ?? null,
      storeNameSnapshot: store.name,
      unitPriceSnapshot: unitPrice,
    })

    stockUpdates.push({ variantId: variant.id, qty: item.quantity })
  }

  // 6. Create the order
  const order = await createOrder({
    userId: user.id,
    status: 'pending',
    totalAmount: total,
    shippingAddressId: data.shippingAddressId,
    note: data.note,
  })

  // 7. Attach orderId and create items
  const itemsWithOrderId = orderItemData.map((item) => ({
    ...item,
    orderId: order.id,
  }))
  await createOrderItems(itemsWithOrderId)

  // 8. Decrement stock
  await decrementVariantStocks(stockUpdates)

  // 9. Clear cart
  await clearCartItems(cart.id)

  return {
    orderId: order.id,
    totalAmount: total.toFixed(2),
    itemCount,
    status: order.status,
    createdAt: order.createdAt,
  }
}
