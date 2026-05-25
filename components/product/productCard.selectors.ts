import type { ProductStockStatus } from '@/features/products/product.dto'

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
  inStock?: boolean
  totalStock?: number
  stockStatus?: ProductStockStatus
  variants?: ProductPresentationVariantLike[]
}

export interface ProductPresentationState {
  defaultVariantId: string | null
  selectedVariantId: string | null
  price: number
  sku?: string
  isAvailable: boolean
  totalStock: number
  stockStatus: ProductStockStatus
  maxQty: number
}

function toNumber(value: string | number): number {
  return typeof value === 'number' ? value : Number(value)
}

export function getDefaultProductVariantId(
  product: ProductPresentationProductLike
): string | null {
  const firstAvailableVariant = product.variants?.find((variant) => (variant.stock ?? 0) > 0)
  return firstAvailableVariant?.id ?? product.variants?.[0]?.id ?? null
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
  const hasVariants = (product.variants?.length ?? 0) > 0
  const totalStock =
    hasVariants
      ? product.variants!.reduce((sum, variant) => sum + Math.max(variant.stock ?? 0, 0), 0)
      : (product.totalStock ?? 0)
  const selectedVariantStock = Math.max(selectedVariant?.stock ?? 0, 0)
  const isAvailable = hasVariants ? selectedVariantStock > 0 : (product.inStock ?? (product.isActive ?? true))
  const stockStatus: ProductStockStatus =
    hasVariants
      ? selectedVariantStock <= 0
        ? 'OUT_OF_STOCK'
        : selectedVariantStock <= 3
          ? 'LOW_STOCK'
          : 'IN_STOCK'
      : (product.stockStatus ?? ((product.inStock ?? true) ? 'IN_STOCK' : 'OUT_OF_STOCK'))

  return {
    defaultVariantId,
    selectedVariantId: selectedVariant?.id ?? defaultVariantId,
    price: toNumber(selectedVariant?.price ?? product.price),
    sku: selectedVariant?.sku ?? product.sku ?? undefined,
    isAvailable,
    totalStock,
    stockStatus,
    maxQty: hasVariants ? selectedVariantStock : Math.max(product.totalStock ?? 0, 0),
  }
}

export type ProductCardProductLike = ProductPresentationProductLike

export function getProductCardDisplayState(product: ProductCardProductLike) {
  return getProductPresentationState(product)
}
