import type { ReactNode } from 'react'
import TableCell from './TableCell'

export default function TableMetaCell({
  title,
  meta,
  children,
  titleClassName = 'font-semibold text-copy-strong',
}: {
  title: ReactNode
  meta?: ReactNode
  children?: ReactNode
  titleClassName?: string
}) {
  return (
    <TableCell>
      <div>
        <p className={titleClassName}>{title}</p>
        {meta ? <p className="mt-1 text-copy-muted">{meta}</p> : null}
        {children}
      </div>
    </TableCell>
  )
}
