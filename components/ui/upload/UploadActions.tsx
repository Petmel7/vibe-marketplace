import type { ReactNode } from 'react'
import clsx from 'clsx'
import ResponsiveActionGroup from '@/components/ui/layout/ResponsiveActionGroup'

export default function UploadActions({
  children,
  className,
  compact = false,
}: {
  children: ReactNode
  className?: string
  compact?: boolean
}) {
  return (
    <ResponsiveActionGroup className={clsx(compact ? 'min-[501px]:w-auto' : '', className)}>
      {children}
    </ResponsiveActionGroup>
  )
}
