import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function CardHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx(actions ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : 'space-y-2', className)}>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
        {description ? <p className="text-sm text-copy-secondary">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}
