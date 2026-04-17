'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from '@/features/wishlist/useWishlist'

interface Props {
  productId: string
  /** 'card' — compact square button used in ProductCard (20 px icon).
   *  'detail' — larger icon-only button used in ProductDetails (24 px icon). */
  variant?: 'card' | 'detail'
}

export default function WishlistToggleButton({ productId, variant = 'detail' }: Props) {
  const { productIds, toggle } = useWishlist()
  const isWishlisted = productIds.has(productId)

  if (variant === 'card') {
    return (
      <button
        type="button"
        aria-label={isWishlisted ? 'Видалити з обраного' : 'Додати до обраного'}
        aria-pressed={isWishlisted}
        onClick={(e) => {
          e.stopPropagation()
          toggle(productId)
        }}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#1D2533] transition-opacity hover:opacity-70"
      >
        <Heart
          size={20}
          aria-hidden="true"
          color={isWishlisted ? '#FF4D6D' : '#A5A8AD'}
          fill={isWishlisted ? '#FF4D6D' : 'none'}
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={isWishlisted ? 'Видалити з обраного' : 'Додати до обраного'}
      aria-pressed={isWishlisted}
      onClick={() => toggle(productId)}
      className="transition-opacity hover:opacity-70"
    >
      <Heart
        size={24}
        aria-hidden="true"
        color={isWishlisted ? '#FF4D6D' : '#A5A8AD'}
        fill={isWishlisted ? '#FF4D6D' : 'none'}
      />
    </button>
  )
}
