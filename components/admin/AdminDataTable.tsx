import type { ReactNode } from 'react'
import { TableShell } from '@/components/ui/table'

export default function AdminDataTable({
  title,
  description,
  actions,
  stackActionsOnTablet = false,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  stackActionsOnTablet?: boolean
  children: ReactNode
}) {
  return (
    <TableShell
      variant="admin"
      title={title}
      description={description}
      actions={actions}
      stackActionsOnTablet={stackActionsOnTablet}
    >
      {children}
    </TableShell>
  )
}
