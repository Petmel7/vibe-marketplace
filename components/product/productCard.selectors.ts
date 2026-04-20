interface ProductCardVariantLike {
  id: string
  sku: string | null
  price: string | number | null
}

export interface ProductCardProductLike {
  price: string | number
  sku: string | null
  variants?: ProductCardVariantLike[]
}

export interface ProductCardDisplayState {
  price: number
  sku?: string
}

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

/**
 * Match ProductDetails fallback behavior for default card display:
 * - use the first variant as the default selection when present
 * - prefer variant price override, otherwise fall back to product price
 * - prefer variant SKU, otherwise fall back to product SKU
 */
export function getProductCardDisplayState(
  product: ProductCardProductLike
): ProductCardDisplayState {
  const defaultVariant = product.variants?.[0] ?? null
  const displayPrice = defaultVariant?.price ?? product.price
  const displaySku = defaultVariant?.sku ?? product.sku ?? undefined

  return {
    price: toNumber(displayPrice),
    sku: displaySku ?? undefined,
  }
}
