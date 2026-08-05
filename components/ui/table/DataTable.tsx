import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DataTable({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <table className={clsx('min-w-full text-sm', className)}>
      {children}
    </table>
  )
}
