'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ComponentType } from 'react'
import type { LucideIcon } from 'lucide-react'

type NavItemComponentProps = {
  size?: number
  className?: string
  iconClassName?: string
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
          className="relative flex items-center justify-center"
          iconClassName={isActive ? 'text-[#E8E9EA]' : 'text-[#A5A8AD]'}
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
