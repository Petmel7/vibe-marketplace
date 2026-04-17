'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { ProductSummaryDto } from '@/features/products/product.dto'

interface SearchResultItemProps {
  product: ProductSummaryDto
  onClose: () => void
}

export default function SearchResultItem({ product, onClose }: SearchResultItemProps) {
  const displayPrice = Number(product.price).toLocaleString('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })

  return (
    <Link
      href={`/products/${product.id}`}
      onClick={onClose}
      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9466FF]"
      aria-label={`${product.name}, ціна ${displayPrice}`}
    >
      <div className="shrink-0 rounded overflow-hidden bg-[#2A3347]">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={48}
            height={48}
            className="object-cover w-12 h-12"
          />
        ) : (
          <div className="w-12 h-12 flex items-center justify-center text-white/30 text-xs">
            No img
          </div>
        )}
      </div>

      <span className="flex-1 text-[#E8E9EA] text-sm truncate min-w-0">
        {product.name}
      </span>

      <span className="shrink-0 text-sm font-semibold text-[#16D9A6]">
        {displayPrice}
      </span>
    </Link>
  )
}
