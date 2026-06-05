import type { ReactNode } from 'react'

export default function AnalyticsChartCard({
  title,
  description,
  actions,
  children,
  summary,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
  summary?: string
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
        </div>
        {actions}
      </div>

      <div className="mt-5">{children}</div>
      {summary ? <p className="mt-4 text-sm text-copy-secondary">{summary}</p> : null}
    </section>
  )
}
