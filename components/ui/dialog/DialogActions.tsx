import type { ReactNode } from 'react'
import clsx from 'clsx'

export default function DialogActions({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-col gap-3 max-[500px]:items-stretch min-[501px]:flex-row min-[501px]:justify-center', className)}>
      {children}
    </div>
  )
}
