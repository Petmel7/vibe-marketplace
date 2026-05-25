import type { ProductSummaryDto } from '@/features/products/product.dto'
import type { MarketplaceBadgeContext, MarketplaceProductBadge } from '@/types/product-badges'
import { getImageUrl } from '@/utils/getImageUrl'

export type ProductListItem = ProductSummaryDto & {
  badges?: MarketplaceProductBadge[]
  badgeContext?: MarketplaceBadgeContext
}

export function isRenderablePublicProduct(product: ProductListItem) {
  const status = (product as ProductListItem & { status?: string }).status

  return product.isActive !== false && (status === undefined || status === 'PUBLISHED')
}

export function toProductCardProps(
  product: ProductListItem,
) {
  return {
    id: product.id,
    name: product.name,
    imageUrl: getImageUrl(product.imageUrl),
    isActive: product.isActive,
    inStock: product.inStock,
    totalStock: product.totalStock,
    stockStatus: product.stockStatus,
    badgeContext: product.badgeContext ?? 'DEFAULT',
    badges: product.badges,
    product: {
      price: product.price,
      sku: product.sku,
      inStock: product.inStock,
      totalStock: product.totalStock,
      stockStatus: product.stockStatus,
      variants: product.variants,
    },
  }
}
