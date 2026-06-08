import AdminStatusBadge from '@/components/admin/AdminStatusBadge'
import type { ReactNode } from 'react'

export default function HealthStatusCard({
  title,
  tone,
  label,
  description,
  meta,
}: {
  title: string
  tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
  label: string
  description: string
  meta?: ReactNode
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-copy-strong">{title}</h2>
          <p className="text-sm text-copy-muted">{description}</p>
        </div>
        <AdminStatusBadge label={label} tone={tone} />
      </div>
      {meta ? <div className="mt-5">{meta}</div> : null}
    </section>
  )
}

