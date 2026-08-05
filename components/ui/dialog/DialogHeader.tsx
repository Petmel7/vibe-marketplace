import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DialogHeader({
  title,
  description,
  titleId,
  descriptionId,
  actions,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  titleId: string
  descriptionId?: string
  actions?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx(actions ? 'flex items-start justify-between gap-4' : 'space-y-2', className)}>
      <div>
        <h2 id={titleId} className="text-xl font-semibold text-copy-strong">
          {title}
        </h2>
        {description ? (
          <p id={descriptionId} className="mt-1 text-sm text-copy-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions}
    </div>
  )
}
