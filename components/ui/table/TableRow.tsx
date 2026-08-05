import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import clsx from 'clsx'

export default function TableRow({
  children,
  className,
  ...props
}: {
  children: ReactNode
  className?: string
} & ComponentPropsWithoutRef<'tr'>) {
  return (
    <tr className={clsx('border-t border-panelBorder align-top', className)} {...props}>
      {children}
    </tr>
  )
}
