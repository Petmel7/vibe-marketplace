import type { ReactNode } from 'react'
import clsx from 'clsx'
import TableCell from './TableCell'

export default function TableActionCell({
  children,
  align = 'left',
}: {
  children: ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  return (
    <TableCell align={align}>
      <div
        className={clsx(
          'flex flex-wrap gap-2',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center',
        )}
      >
        {children}
      </div>
    </TableCell>
  )
}
