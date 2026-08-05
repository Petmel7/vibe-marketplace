import type { ReactNode } from 'react'
import clsx from 'clsx'
import TableToolbar from './TableToolbar'

export type TableShellVariant = 'admin' | 'seller' | 'profile'

export default function TableShell({
  title,
  description,
  actions,
  stackActionsOnTablet = false,
  variant = 'admin',
  children,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  stackActionsOnTablet?: boolean
  variant?: TableShellVariant
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('ui-elevated-panel overflow-hidden', className)} data-table-variant={variant}>
      <TableToolbar
        title={title}
        description={description}
        actions={actions}
        stackActionsOnTablet={stackActionsOnTablet}
      />
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
