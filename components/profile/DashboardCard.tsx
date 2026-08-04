import type { ReactNode } from 'react'
import DetailPanel from '@/components/ui/panel/DetailPanel'

export default function DashboardCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <DetailPanel title={title} description={description} actions={action} className={className}>
      {children}
    </DetailPanel>
  )
}
