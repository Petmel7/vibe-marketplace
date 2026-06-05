import type { ReactNode } from 'react'
import { formatAnalyticsPercent, getTrendTone } from './analytics.utils'

export default function AnalyticsKpiCard({
  label,
  value,
  detail,
  trend,
  tone,
  accent,
}: {
  label: string
  value: string | number
  detail?: ReactNode
  trend?: number | null
  tone?: 'default' | 'danger' | 'success' | 'warning'
  accent?: ReactNode
}) {
  const borderTone =
    tone === 'danger'
      ? 'border-l-brand-danger'
      : tone === 'success'
        ? 'border-l-emerald-600'
        : tone === 'warning'
          ? 'border-l-amber-500'
          : 'border-l-brand-primary'

  return (
    <section className={`ui-elevated-panel border-l-4 ${borderTone} p-5 sm:p-6`}>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{label}</p>
          <p className="text-3xl font-semibold text-copy-strong">{value}</p>
          {trend !== undefined ? (
            <p className={`text-sm font-medium ${getTrendTone(trend)}`}>{formatAnalyticsPercent(trend)}</p>
          ) : null}
        </div>
        {accent}
      </div>
      {detail ? <div className="mt-4 text-sm text-copy-secondary">{detail}</div> : null}
    </section>
  )
}
