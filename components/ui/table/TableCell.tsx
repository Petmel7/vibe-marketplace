import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import clsx from 'clsx'

export default function TableCell({
  children,
  tone,
  align = 'left',
  className,
  ...props
}: {
  children: ReactNode
  tone?: 'primary' | 'secondary' | 'muted'
  align?: 'left' | 'right' | 'center'
  className?: string
} & ComponentPropsWithoutRef<'td'>) {
  return (
    <td
      className={clsx(
        'px-5 py-4',
        tone === 'primary' && 'text-copy-primary',
        tone === 'secondary' && 'text-copy-secondary',
        tone === 'muted' && 'text-copy-muted',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
      {...props}
    >
      {children}
    </td>
  )
}
