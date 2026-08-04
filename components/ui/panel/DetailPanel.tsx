import type { ReactNode } from 'react'
import clsx from 'clsx'
import Panel from './Panel'

export default function DetailPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Panel className={className}>
      {title || description || actions ? (
        <div className={clsx('flex items-start justify-between gap-4', children ? 'mb-5' : '')}>
          <div className="space-y-1">
            {title ? <h2 className="text-lg font-semibold text-copy-strong">{title}</h2> : null}
            {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </Panel>
  )
}
