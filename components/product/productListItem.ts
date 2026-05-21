import type { ProductSummaryDto } from '@/features/products/product.dto'
import type { MarketplaceProductBadge } from '@/types/product-badges'
import { getImageUrl } from '@/utils/getImageUrl'

export type ProductListItem = ProductSummaryDto & {
  badges?: MarketplaceProductBadge[]
}

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
    badges: product.badges,
    product: {
      price: product.price,
      sku: product.sku,
      variants: [],
    },
  }
}
