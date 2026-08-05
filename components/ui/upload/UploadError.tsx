import type { ReactNode } from 'react'
import clsx from 'clsx'
import Alert from '@/components/ui/alert/Alert'

export default function UploadError({
  id,
  children,
  className,
}: {
  id?: string
  children?: ReactNode
  className?: string
}) {
  if (!children) {
    return null
  }

  return (
    <Alert tone="danger" role="alert" className={clsx('text-sm', className)}>
      <span id={id}>{children}</span>
    </Alert>
  )
}
