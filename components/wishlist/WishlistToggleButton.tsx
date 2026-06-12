'use client'

import { Heart } from 'lucide-react'
import { useWishlist } from '@/components/wishlist/hooks/useWishlist'

interface Props {
  productId: string
  variant?: 'card' | 'detail'
}

export default function WishlistToggleButton({
  productId,
  variant = 'detail',
}: Props) {
  const {
    productIds,
    pendingProductIds,
    toggle,
  } = useWishlist()
  const isWishlisted =
    productIds.has(productId)
  const isPending =
    pendingProductIds.has(productId)

  if (variant === 'card') {
    return (
      <button
        type="button"
        aria-label={
          isWishlisted
            ? 'Видалити з обраного'
            : 'Додати до обраного'
        }
        aria-pressed={isWishlisted}
        aria-busy={isPending}
        disabled={isPending}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggle(productId)
        }}
        className="ui-icon-button-card disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Heart
          size={20}
          aria-hidden="true"
          color={
            isWishlisted
              ? '#FF4D6D'
              : '#A5A8AD'
          }
          fill={
            isWishlisted
              ? '#FF4D6D'
              : 'none'
          }
        />
      </button>
    )
  }

  return (
    <button
      type="button"
      aria-label={
        isWishlisted
          ? 'Видалити з обраного'
          : 'Додати до обраного'
      }
      aria-pressed={isWishlisted}
      aria-busy={isPending}
      disabled={isPending}
      onClick={() => toggle(productId)}
      className="ui-icon-button disabled:cursor-not-allowed disabled:opacity-70"
    >
      <Heart
        size={24}
        aria-hidden="true"
        color={
          isWishlisted
            ? '#FF4D6D'
            : '#A5A8AD'
        }
        fill={
          isWishlisted
            ? '#FF4D6D'
            : 'none'
        }
      />
    </button>
  )
}
