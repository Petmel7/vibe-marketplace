'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ICON_BADGE_BOTTOM_NAV_POSITION_CLASS,
  ICON_BADGE_BOTTOM_NAV_TEXT_OFFSET_CLASS,
  ICON_BADGE_ROOT_CLASS,
} from '@/components/ui/IconWithBadge'

type NavItemComponentProps = {
  size?: number
  className?: string
  iconClassName?: string
  badgeClassName?: string
  countTextClassName?: string
  ariaLabel?: string
  ariaCurrent?: 'page'
}

interface Props {
  href?: string
  icon?: LucideIcon
  label: string
  component?: ComponentType<NavItemComponentProps>
  className?: string
  exact?: boolean
}

export default function NavItem({
  href,
  icon: Icon,
  label,
  component: Component,
  className,
  exact = false,
}: Props) {
  const pathname = usePathname()
  const isActive = href
    ? exact
      ? pathname === href
      : pathname.startsWith(href)
    : false

  const color = isActive ? '#E8E9EA' : '#A5A8AD'
  const itemClassName = className ?? 'ui-mobile-nav-link'

  if (Component) {
    return (
      <div className={itemClassName}>
        <Component
          size={24}
          className={ICON_BADGE_ROOT_CLASS}
          iconClassName={isActive ? 'text-[#E8E9EA]' : 'text-[#A5A8AD]'}
          badgeClassName={ICON_BADGE_BOTTOM_NAV_POSITION_CLASS}
          countTextClassName={ICON_BADGE_BOTTOM_NAV_TEXT_OFFSET_CLASS}
          ariaLabel={label}
          ariaCurrent={isActive ? 'page' : undefined}
        />
        <span style={{ color }}>{label}</span>
      </div>
    )
  }

  if (!href || !Icon) {
    return null
  }

  return (
    <Link href={href} className={itemClassName} aria-current={isActive ? 'page' : undefined}>
      <Icon size={24} color={color} aria-hidden="true" />
      <span style={{ color }}>{label}</span>
    </Link>
  )
}
