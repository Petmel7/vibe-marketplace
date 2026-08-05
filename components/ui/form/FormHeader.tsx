import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormHeader({
  title,
  description,
  actions,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx(actions ? 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between' : 'ui-heading-stack', className)}>
      <div className="ui-heading-stack">
        {title ? <h2 className="ui-card-title">{title}</h2> : null}
        {description ? <p className="ui-form-helper">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}
