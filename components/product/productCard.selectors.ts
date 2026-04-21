interface ProductPresentationVariantLike {
  id: string
  sku: string | null
  price: string | number | null
  stock?: number | null
}

export interface ProductPresentationProductLike {
  price: string | number
  sku: string | null
  isActive?: boolean
  variants?: ProductPresentationVariantLike[]
}

export interface ProductPresentationState {
  defaultVariantId: string | null
  selectedVariantId: string | null
  price: number
  sku?: string
  isAvailable: boolean
  maxQty: number
}

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

export function getDefaultProductVariantId(
  product: ProductPresentationProductLike
): string | null {
  return product.variants?.[0]?.id ?? null
}

export function getProductPresentationState(
  product: ProductPresentationProductLike,
  selectedVariantId?: string | null
): ProductPresentationState {
  const defaultVariantId = getDefaultProductVariantId(product)
  const resolvedVariantId = selectedVariantId ?? defaultVariantId
  const selectedVariant =
    product.variants?.find((variant) => variant.id === resolvedVariantId) ??
    product.variants?.[0] ??
    null

  return {
    defaultVariantId,
    selectedVariantId: selectedVariant?.id ?? defaultVariantId,
    price: toNumber(selectedVariant?.price ?? product.price),
    sku: selectedVariant?.sku ?? product.sku ?? undefined,
    isAvailable: product.isActive ?? true,
    maxQty: selectedVariant?.stock ?? 99,
  }
}

export type ProductCardProductLike = ProductPresentationProductLike

export function getProductCardDisplayState(product: ProductCardProductLike) {
  return getProductPresentationState(product)
}
