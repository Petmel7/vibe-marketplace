import type { ProductStockStatus, ProductVariantDto } from '@/features/products/product.dto'

const LOW_STOCK_THRESHOLD = 3

export type InventoryStatusChip = {
  label: string
  className: string
  dotClassName?: string
}

export function getInventoryStatusChip(
  status: ProductStockStatus | null | undefined,
): InventoryStatusChip | null {
  if (status === 'OUT_OF_STOCK') {
    return {
      label: 'Закінчився',
      className: 'rounded-full border border-brand-danger/30 bg-brand-danger/10 px-3 py-1 text-sm font-medium text-copy-primary',
    }
  }

  if (status === 'LOW_STOCK') {
    return {
      label: 'Мало в наявності',
      className: 'rounded-full border border-amber-300/40 bg-amber-300/15 px-3 py-1 text-sm font-medium text-copy-primary',
    }
  }

  if (status === 'IN_STOCK') {
    return {
      label: 'В наявності',
      className: 'ui-status-badge',
      dotClassName: 'ui-status-dot',
    }
  }

  return null
}

export function deriveInventoryStatusFromVariants(
  variants: Array<Pick<ProductVariantDto, 'stock'>>,
): {
  inStock: boolean
  totalStock: number
  stockStatus: ProductStockStatus
} {
  const totalStock = variants.reduce((sum, variant) => sum + Math.max(variant.stock, 0), 0)
  const inStock = variants.some((variant) => variant.stock > 0)

  if (!inStock || totalStock <= 0) {
    return {
      inStock: false,
      totalStock,
      stockStatus: 'OUT_OF_STOCK',
    }
  }

  if (totalStock <= LOW_STOCK_THRESHOLD) {
    return {
      inStock: true,
      totalStock,
      stockStatus: 'LOW_STOCK',
    }
  }

  return {
    inStock: true,
    totalStock,
    stockStatus: 'IN_STOCK',
  }
}
