import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function TableToolbar({
  title,
  description,
  actions,
  stackActionsOnTablet = false,
  className,
}: {
  title: string
  description?: string
  actions?: ReactNode
  stackActionsOnTablet?: boolean
  className?: string
}) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-4 border-b border-panelBorder px-5 py-5 sm:px-6',
        stackActionsOnTablet
          ? 'xl:flex-row xl:items-start xl:justify-between'
          : 'sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
        {description ? <p className="text-sm text-copy-muted">{description}</p> : null}
      </div>
      {actions}
    </div>
  )
}
