import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DialogBody({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={clsx('mt-6', className)}>{children}</div>
}
