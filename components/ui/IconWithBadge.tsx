'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export const ICON_BADGE_ROOT_CLASS = 'relative flex items-center justify-center'
export const ICON_BADGE_DEFAULT_POSITION_CLASS = '-right-1.5 -top-1.5'
export const ICON_BADGE_DESKTOP_HEADER_POSITION_CLASS = '-right-1.5 -top-1'
export const ICON_BADGE_BOTTOM_NAV_POSITION_CLASS = '-right-1.5 -top-2'
export const ICON_BADGE_DEFAULT_TEXT_OFFSET_CLASS = ''
export const ICON_BADGE_DESKTOP_HEADER_TEXT_OFFSET_CLASS = 'translate-y-px'
export const ICON_BADGE_BOTTOM_NAV_TEXT_OFFSET_CLASS = '-translate-y-px'
export const ICON_BADGE_COUNTER_CLASS = 'ui-badge-counter'
export const ICON_BADGE_DOT_CLASS = 'ui-badge-dot'

interface Props {
  href: string
  icon: LucideIcon
  ariaLabel: string
  count?: number
  size?: number
  className?: string
  iconClassName?: string
  badgeClassName?: string
  countTextClassName?: string
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
  badgeClassName,
  countTextClassName,
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
      className={className ?? ICON_BADGE_ROOT_CLASS}
    >
      <Icon size={size} aria-hidden="true" className={iconClassName} />
      {shouldShowBadge && (
        variant === 'dot' ? (
          <span
            className={`${ICON_BADGE_DOT_CLASS} ${badgeClassName ?? ICON_BADGE_DEFAULT_POSITION_CLASS}`}
            aria-hidden="true"
          />
        ) : (
          <span
            className={`${ICON_BADGE_COUNTER_CLASS} ${badgeClassName ?? ICON_BADGE_DEFAULT_POSITION_CLASS}`}
            aria-hidden="true"
          >
            <span className={countTextClassName ?? ICON_BADGE_DEFAULT_TEXT_OFFSET_CLASS}>
              {count > 99 ? '99+' : count}
            </span>
          </span>
        )
      )}
    </Link>
  )
}
