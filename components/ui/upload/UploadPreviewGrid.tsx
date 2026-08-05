import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function UploadPreviewGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={clsx('grid gap-4 lg:grid-cols-2', className)}>{children}</div>
}
