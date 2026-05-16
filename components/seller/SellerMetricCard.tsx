import type { ReactNode } from 'react'

export default function SellerMetricCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string | number
  detail?: ReactNode
  accent?: ReactNode
}) {
  return (
    <section className="ui-elevated-panel p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-copy-muted">{label}</p>
          <p className="mt-3 text-3xl font-semibold text-copy-strong">{value}</p>
        </div>
        {accent}
      </div>
      {detail ? <div className="mt-4 text-sm text-copy-secondary">{detail}</div> : null}
    </section>
  )
}
