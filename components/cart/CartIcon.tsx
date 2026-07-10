'use client'

import { ShoppingCart } from 'lucide-react'
import IconWithBadge from '@/components/ui/IconWithBadge'
import { useCartStore } from '@/store/cartStore'

interface Props {
  size?: number
  className?: string
  iconClassName?: string
  badgeClassName?: string
  countTextClassName?: string
  ariaLabel?: string
  ariaCurrent?: 'page'
}

export default function CartIcon({
  size = 24,
  className,
  iconClassName = 'text-[#E8E9EA]',
  badgeClassName,
  countTextClassName,
  ariaLabel,
  ariaCurrent,
}: Props) {
  const itemCount = useCartStore((s) => s.itemCount)

  return (
    <IconWithBadge
      href="/cart"
      icon={ShoppingCart}
      count={itemCount}
      size={size}
      className={className}
      iconClassName={iconClassName}
      badgeClassName={badgeClassName}
      countTextClassName={countTextClassName}
      ariaLabel={ariaLabel ?? `Кошик${itemCount > 0 ? `, ${itemCount} товарів` : ''}`}
      ariaCurrent={ariaCurrent}
      variant="count"
    />
  )
}
