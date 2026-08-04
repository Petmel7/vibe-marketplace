import type { ReactNode } from 'react'
import clsx from 'clsx'

type MetricGridColumns = 3 | 4 | 5

const columnsClassName: Record<MetricGridColumns, string> = {
  3: 'md:grid-cols-2 xl:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
  5: 'md:grid-cols-2 xl:grid-cols-5',
}

export default function MetricGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode
  columns?: MetricGridColumns
  className?: string
}) {
  return <div className={clsx('grid gap-4', columnsClassName[columns], className)}>{children}</div>
}
