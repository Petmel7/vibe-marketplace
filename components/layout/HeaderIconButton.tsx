import Link from 'next/link'
import type { ReactNode } from 'react'

export default function HeaderIconButton({
  label,
  children,
  onClick,
  href,
  className,
}: {
  label: string
  children: ReactNode
  onClick?: () => void
  href?: string
  className?: string
}) {
  if (href) {
    return (
      <Link aria-label={label} className={className ?? 'ui-icon-button'} href={href}>
        {children}
      </Link>
    )
  }

  return (
    <button aria-label={label} className={className ?? 'ui-icon-button'} onClick={onClick}>
      {children}
    </button>
  )
}
