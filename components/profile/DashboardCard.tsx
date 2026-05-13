import type { ReactNode } from 'react'

export default function DashboardCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`ui-elevated-panel p-5 sm:p-6 ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  )
}
