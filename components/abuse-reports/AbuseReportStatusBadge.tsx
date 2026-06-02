import type { AbuseReportStatus } from '@/types/abuse-reports'

const STATUS_STYLES: Record<AbuseReportStatus, { label: string; className: string }> = {
  PENDING: {
    label: 'Очікує',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  UNDER_REVIEW: {
    label: 'На розгляді',
    className: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  },
  RESOLVED: {
    label: 'Вирішено',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
  DISMISSED: {
    label: 'Відхилено',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  },
  ESCALATED: {
    label: 'Ескаловано',
    className: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  },
}

export default function AbuseReportStatusBadge({ status }: { status: AbuseReportStatus }) {
  const config = STATUS_STYLES[status]

  return (
    <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
