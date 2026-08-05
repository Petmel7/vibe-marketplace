import type { ReactNode } from 'react'
import clsx from 'clsx'
import ResponsiveActionGroup from '@/components/ui/layout/ResponsiveActionGroup'

export default function FormActions({
  children,
  className,
  responsive = false,
}: {
  children: ReactNode
  className?: string
  responsive?: boolean
}) {
  if (responsive) {
    return <ResponsiveActionGroup className={className}>{children}</ResponsiveActionGroup>
  }

  return (
    <div className={clsx('ui-action-row', className)}>
      {children}
    </div>
  )
}
