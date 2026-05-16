import type { ReactNode } from 'react'

export default function AdminFilterBar({
  action,
  children,
}: {
  action: string
  children: ReactNode
}) {
  return (
    <form action={action} className="ui-elevated-panel p-4 sm:p-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end">{children}</div>
    </form>
  )
}
