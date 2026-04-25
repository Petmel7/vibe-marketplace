import type { ProductSummaryDto } from '@/features/products/product.dto'

export type ProductListItem = ProductSummaryDto

export function toProductCardProps(product: ProductListItem) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: product.imageUrl || '/placeholder.png',
    isActive: product.isActive,
    isHit: product.isHit,
    isNew: product.isNew,
    product: {
      price: product.price,
      sku: product.sku,
      variants: [],
    },
  }
}
