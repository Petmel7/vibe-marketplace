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
    <section className={clsx('space-y-5', className)}>
      {title || description ? (
        <div className="space-y-1">
          {title ? <h2 className="text-lg font-semibold text-copy-strong">{title}</h2> : null}
          {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  )
}
