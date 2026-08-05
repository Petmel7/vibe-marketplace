import type { ReactNode } from 'react'
import DetailPanel from '@/components/ui/panel/DetailPanel'

export default function FormCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <DetailPanel title={title} description={description} actions={actions} className={className}>
      {children}
    </DetailPanel>
  )
}
