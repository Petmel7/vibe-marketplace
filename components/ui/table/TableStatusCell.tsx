import type { ReactNode } from 'react'
import TableCell from './TableCell'

export default function TableStatusCell({ children }: { children: ReactNode }) {
  return (
    <TableCell>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </TableCell>
  )
}
