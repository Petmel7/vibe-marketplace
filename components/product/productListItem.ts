import type { ProductSummaryDto } from '@/features/products/product.dto'
import { getImageUrl } from '@/utils/getImageUrl'

export type ProductListItem = ProductSummaryDto

export function toProductCardProps(
  product: ProductListItem,
  badgeVariant?: 'hit' | 'new',
) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: getImageUrl(product.imageUrl),
    isActive: product.isActive,
    isHit: product.isHit,
    isNew: product.isNew,
    badgeVariant,
    product: {
      price: product.price,
      sku: product.sku,
      variants: [],
    },
  }
}
