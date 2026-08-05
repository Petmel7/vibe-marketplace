import type { ReactNode } from 'react'
import { TableShell } from '@/components/ui/table'

export default function SellerTable({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <TableShell variant="seller" title={title} description={description}>
      {children}
    </TableShell>
  )
}
