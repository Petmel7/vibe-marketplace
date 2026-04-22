'use client'

import Link from 'next/link'
import { ShoppingCart } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

interface Props {
  size?: number
  className?: string
  iconClassName?: string
  ariaLabel?: string
  ariaCurrent?: 'page'
}

export default function CartIcon({
  size = 24,
  className,
  iconClassName = 'text-[#E8E9EA]',
  ariaLabel,
  ariaCurrent,
}: Props) {
  const itemCount = useCartStore((s) => s.itemCount)

  return (
    <Link
      href="/cart"
      aria-label={ariaLabel ?? `Кошик${itemCount > 0 ? `, ${itemCount} товарів` : ''}`}
      aria-current={ariaCurrent}
      className={className ?? 'relative flex items-center justify-center'}
    >
      <ShoppingCart size={size} aria-hidden="true" className={iconClassName} />
      {itemCount > 0 && (
        <span className="ui-badge-counter" aria-hidden="true">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}
