'use client'

import { Heart } from 'lucide-react'
import IconWithBadge from '@/components/ui/IconWithBadge'
import { useWishlist } from '@/components/wishlist/hooks/useWishlist'

interface Props {
  size?: number
  className?: string
  iconClassName?: string
  badgeClassName?: string
  countTextClassName?: string
  ariaLabel?: string
  ariaCurrent?: 'page'
  variant?: 'count' | 'dot'
  showZero?: boolean
}

export default function WishlistIcon({
  size = 24,
  className,
  iconClassName = 'text-[#E8E9EA]',
  badgeClassName,
  countTextClassName,
  ariaLabel,
  ariaCurrent,
  variant = 'count',
  showZero = false,
}: Props) {
  const { productIds } = useWishlist()
  const itemCount = productIds.size

  const fallbackLabel =
    variant === 'dot'
      ? `Обране${itemCount > 0 || showZero ? ' має товари' : ' порожнє'}`
      : `Обране${itemCount > 0 ? `, ${itemCount} товарів` : ''}`

  return (
    <IconWithBadge
      href="/wishlist"
      icon={Heart}
      count={itemCount}
      size={size}
      className={className}
      iconClassName={iconClassName}
      badgeClassName={badgeClassName}
      countTextClassName={countTextClassName}
      ariaLabel={ariaLabel ?? fallbackLabel}
      ariaCurrent={ariaCurrent}
      variant={variant}
      showZero={showZero}
    />
  )
}
