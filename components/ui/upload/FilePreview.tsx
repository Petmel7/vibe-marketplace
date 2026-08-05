import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function FilePreview({
  fileName,
  metadata,
  icon,
  action,
  className,
}: {
  fileName: ReactNode
  metadata?: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <article className={clsx('flex items-start gap-3 rounded-3xl border border-panelBorder bg-panel/60 p-4', className)}>
      {icon ? <div className="shrink-0">{icon}</div> : null}
      <div className="min-w-0 flex-1">
        <p className="break-words text-sm font-medium text-copy-strong">{fileName}</p>
        {metadata ? <div className="mt-1 text-xs text-copy-muted">{metadata}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </article>
  )
}
