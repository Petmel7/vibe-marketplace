'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

interface Props {
  href: string
  icon: LucideIcon
  ariaLabel: string
  count?: number
  size?: number
  className?: string
  iconClassName?: string
  ariaCurrent?: 'page'
  variant?: 'count' | 'dot'
  showZero?: boolean
}

export default function IconWithBadge({
  href,
  icon: Icon,
  ariaLabel,
  count = 0,
  size = 24,
  className,
  iconClassName,
  ariaCurrent,
  variant = 'count',
  showZero = false,
}: Props) {
  const shouldShowBadge = count > 0 || showZero

  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={className ?? 'relative flex items-center justify-center'}
    >
      <Icon size={size} aria-hidden="true" className={iconClassName} />
      {shouldShowBadge && (
        variant === 'dot' ? (
          <span className="ui-badge-dot" aria-hidden="true" />
        ) : (
          <span className="ui-badge-counter" aria-hidden="true">
            {count > 99 ? '99+' : count}
          </span>
        )
      )}
    </Link>
  )
}
