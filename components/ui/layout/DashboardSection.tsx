import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DashboardSection({
  eyebrow,
  title,
  description,
  children,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('space-y-5', className)}>
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{eyebrow}</p>
        ) : null}
        <h1 className="ui-heading-page">{title}</h1>
        {description ? <p className="max-w-3xl text-sm text-copy-secondary">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}
