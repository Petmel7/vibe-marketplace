'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductSearchItemDto } from '@/features/products/product.dto'
import { formatPrice } from '@/utils/formatters/price'
import { getImageUrl } from '@/utils/getImageUrl'

interface SearchResultItemProps {
  product: ProductSearchItemDto
  onClose: () => void
}

export default function SearchResultItem({
  product,
  onClose,
}: SearchResultItemProps) {
  const displayPrice = formatPrice(product.price)
  const imageUrl = getImageUrl(product.imageUrl) || '/placeholder.png'

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onClose}
      className="ui-search-item"
      aria-label={`${product.name}, Ціна ${displayPrice}`}
    >
      <div className="ui-thumb-frame ui-thumb-frame-sm">
        <Image
          src={imageUrl}
          alt={product.name}
          width={48}
          height={48}
          className="h-12 w-12 object-cover"
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-copy-primary">{product.name}</p>
        {product.storeName ? (
          <p className="truncate text-xs text-copy-muted">{product.storeName}</p>
        ) : null}
      </div>

      <span className="shrink-0 text-sm font-semibold text-brand-accent">
        {displayPrice}
      </span>
    </Link>
  )
}
