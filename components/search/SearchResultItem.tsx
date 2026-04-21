'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductSummaryDto } from '@/features/products/product.dto'
import { formatPrice } from '@/lib/formatters/price'

interface SearchResultItemProps {
  product: ProductSummaryDto
  onClose: () => void
}

export default function SearchResultItem({ product, onClose }: SearchResultItemProps) {
  const displayPrice = formatPrice(product.price)

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onClose}
      className="ui-search-item"
      aria-label={`${product.name}, Ціна ${displayPrice}`}
    >
      <div className="ui-thumb-frame ui-thumb-frame-sm">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={48}
            height={48}
            className="h-12 w-12 object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center text-xs text-white/30">
            No img
          </div>
        )}
      </div>

      <span className="min-w-0 flex-1 truncate text-sm text-copy-primary">{product.name}</span>
      <span className="shrink-0 text-sm font-semibold text-brand-accent">{displayPrice}</span>
    </Link>
  )
}
