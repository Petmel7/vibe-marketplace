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

function getPurchasableVariants(product: ProductPresentationProductLike) {
  return product.variants?.filter((variant) => Math.max(variant.stock ?? 0, 0) > 0) ?? []
}

export function getFirstPurchasableVariantId(
  product: ProductPresentationProductLike,
): string | null {
  return getPurchasableVariants(product)[0]?.id ?? null
}

function getPreferredDisplayVariant(product: ProductPresentationProductLike) {
  return getPurchasableVariants(product)[0] ?? product.variants?.[0] ?? null
}

export function requiresExplicitVariantSelection(
  product: ProductPresentationProductLike,
): boolean {
  return getPurchasableVariants(product).length > 1
}

export function getDefaultProductVariantId(
  product: ProductPresentationProductLike,
): string | null {
  const purchasableVariants = getPurchasableVariants(product)

  return purchasableVariants.length === 1 ? purchasableVariants[0]?.id ?? null : null
}

export function getProductPresentationState(
  product: ProductPresentationProductLike,
  selectedVariantId?: string | null,
): ProductPresentationState {
  const defaultVariantId = getDefaultProductVariantId(product)
  const resolvedSelectedVariantId = selectedVariantId ?? defaultVariantId
  const selectedVariant =
    product.variants?.find((variant) => variant.id === resolvedSelectedVariantId) ?? null
  const displayVariant = selectedVariant ?? getPreferredDisplayVariant(product)
  const hasVariants = (product.variants?.length ?? 0) > 0
  const totalStock =
    hasVariants
      ? product.variants!.reduce((sum, variant) => sum + Math.max(variant.stock ?? 0, 0), 0)
      : Math.max(product.totalStock ?? 0, 0)
  const selectedVariantStock = Math.max(selectedVariant?.stock ?? 0, 0)
  const displayVariantStock = Math.max(displayVariant?.stock ?? 0, 0)
  const isAvailable = hasVariants
    ? selectedVariant
      ? selectedVariantStock > 0
      : totalStock > 0
    : (product.inStock ?? (product.isActive ?? true))
  const stockStatus: ProductStockStatus = hasVariants
    ? selectedVariant
      ? selectedVariantStock <= 0
        ? 'OUT_OF_STOCK'
        : selectedVariantStock <= 3
          ? 'LOW_STOCK'
          : 'IN_STOCK'
      : displayVariantStock <= 0
        ? 'OUT_OF_STOCK'
        : displayVariantStock <= 3
          ? 'LOW_STOCK'
          : 'IN_STOCK'
    : (product.stockStatus ?? ((product.inStock ?? true) ? 'IN_STOCK' : 'OUT_OF_STOCK'))

  return {
    defaultVariantId,
    selectedVariantId: selectedVariant?.id ?? defaultVariantId,
    price: toNumber(displayVariant?.price ?? product.price),
    sku: displayVariant?.sku ?? product.sku ?? undefined,
    isAvailable,
    totalStock,
    stockStatus,
    maxQty: hasVariants
      ? selectedVariant
        ? selectedVariantStock
        : displayVariantStock
      : Math.max(product.totalStock ?? 0, 0),
  }
}

export type ProductCardProductLike = ProductPresentationProductLike

export function getProductCardDisplayState(product: ProductCardProductLike) {
  return getProductPresentationState(product)
}
