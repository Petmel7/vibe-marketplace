import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function UploadCard({
  children,
  title,
  description,
  className,
  headerClassName,
}: {
  children: ReactNode
  title?: ReactNode
  description?: ReactNode
  className?: string
  headerClassName?: string
}) {
  return (
    <section className={clsx('space-y-3 rounded-3xl border border-panelBorder bg-panel/60 p-4', className)}>
      {title || description ? (
        <div className={clsx('space-y-1', headerClassName)}>
          {title}
          {description}
        </div>
      ) : null}
      {children}
    </section>
  )
}
