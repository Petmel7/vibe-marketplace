import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('ui-form-section-stack', className)}>
      {title || description ? (
        <div className="ui-heading-stack">
          {title ? <h2 className="ui-card-title">{title}</h2> : null}
          {description ? <p className="ui-form-helper">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
