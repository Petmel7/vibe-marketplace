import type { ReactNode } from 'react'
import clsx from 'clsx'

type FormGridColumns = 2 | 3
type FormGridBreakpoint = 'sm' | 'lg' | 'xl'

const gridClassName: Record<FormGridBreakpoint, Record<FormGridColumns, string>> = {
  sm: {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
  },
  lg: {
    2: 'lg:grid-cols-2',
    3: 'lg:grid-cols-3',
  },
  xl: {
    2: 'xl:grid-cols-2',
    3: 'xl:grid-cols-3',
  },
}

export default function FormGrid({
  children,
  columns = 2,
  at = 'lg',
  className,
}: {
  children: ReactNode
  columns?: FormGridColumns
  at?: FormGridBreakpoint
  className?: string
}) {
  return (
    <div className={clsx('grid gap-4', gridClassName[at][columns], className)}>
      {children}
    </div>
  )
}
