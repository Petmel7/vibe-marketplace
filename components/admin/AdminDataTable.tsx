import type { ReactNode } from 'react'

export default function AdminDataTable({
  title,
  description,
  actions,
  stackActionsOnTablet = false,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  stackActionsOnTablet?: boolean
  children: ReactNode
}) {
  return (
    <section className="ui-elevated-panel overflow-hidden">
      <div
        className={`flex flex-col gap-4 border-b border-panelBorder px-5 py-5 sm:px-6 ${
          stackActionsOnTablet
            ? 'xl:flex-row xl:items-start xl:justify-between'
            : 'sm:flex-row sm:items-start sm:justify-between'
        }`}
      >
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
        </div>
        {actions}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
