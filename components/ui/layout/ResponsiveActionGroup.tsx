import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function ResponsiveActionGroup({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex w-full flex-col items-center gap-3 max-[500px]:items-stretch', className)}>
      {children}
    </div>
  )
}
