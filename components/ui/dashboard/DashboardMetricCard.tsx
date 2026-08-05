import type { ReactNode } from 'react'
import Panel from '@/components/ui/panel/Panel'

export default function DashboardMetricCard({
  label,
  value,
  detail,
  accent,
  className,
  labelClassName,
  valueClassName,
  detailClassName,
}: {
  label: string
  value: string | number
  detail?: ReactNode
  accent?: ReactNode
  className?: string
  labelClassName?: string
  valueClassName?: string
  detailClassName?: string
}) {
  const labelMarkup = (
    <p className={labelClassName ?? 'text-xs font-medium uppercase tracking-[0.24em] text-copy-muted'}>
      {label}
    </p>
  )
  const valueMarkup = <p className={valueClassName ?? 'mt-3 text-3xl font-semibold text-copy-strong'}>{value}</p>

  return (
    <Panel className={className}>
      {accent ? (
        <div className="flex items-start justify-between gap-4">
          <div>
            {labelMarkup}
            {valueMarkup}
          </div>
          {accent}
        </div>
      ) : (
        <>
          {labelMarkup}
          {valueMarkup}
        </>
      )}
      {detail ? <div className={detailClassName ?? 'mt-4 text-sm text-copy-secondary'}>{detail}</div> : null}
    </Panel>
  )
}
