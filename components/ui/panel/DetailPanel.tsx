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
          <div className="ui-heading-stack">
            {title ? <h2 className="ui-card-title">{title}</h2> : null}
            {description ? <p className="ui-form-helper">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </Panel>
  )
}
