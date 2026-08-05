import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import clsx from 'clsx'

export default function TableHeaderCell({
  children,
  align = 'left',
  className,
  scope = 'col',
  ...props
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
  className?: string
} & ComponentPropsWithoutRef<'th'>) {
  return (
    <th
      scope={scope}
      className={clsx(
        'px-5 py-3 font-medium',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </th>
  )
}
